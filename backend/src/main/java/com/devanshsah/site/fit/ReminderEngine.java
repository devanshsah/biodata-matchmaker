package com.devanshsah.site.fit;

import java.sql.Date;
import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/**
 * Sends reminders from memory, so a free serverless Postgres (Neon) can sleep between uses.
 * The database is read only at startup and when the app syncs its schedule or saves ticks.
 *
 * Something calls {@link #fireDue()} regularly: a 30-second timer when running in Docker,
 * or Cloud Scheduler hitting /api/internal/reminders/tick on Cloud Run.
 */
@Service
public class ReminderEngine {
    private static final Logger log = LoggerFactory.getLogger(ReminderEngine.class);
    private static final Duration CATCH_UP = Duration.ofMinutes(10);

    public record Reminder(LocalDate day, String item, String kind, Instant fireAt, String title, String body) {
        String key() {
            return day + "|" + item + "|" + kind;
        }
    }

    private final JdbcTemplate db;
    private final PushSender push;
    private final ZoneId zone;
    private final List<Reminder> upcoming = new CopyOnWriteArrayList<>();
    private final Set<String> sent = ConcurrentHashMap.newKeySet();
    private final Map<LocalDate, Set<String>> ticks = new ConcurrentHashMap<>();
    private volatile Instant startedAt = Instant.now();

    public ReminderEngine(JdbcTemplate db, PushSender push, @Value("${app.zone}") String zone) {
        this.db = db;
        this.push = push;
        this.zone = ZoneId.of(zone);
    }

    @EventListener(ApplicationReadyEvent.class)
    public void load() {
        startedAt = Instant.now();
        reloadReminders();
        LocalDate today = LocalDate.now(zone);
        for (LocalDate d : List.of(today.minusDays(1), today)) {
            ticks.put(d, ConcurrentHashMap.newKeySet());
            db.query("SELECT item FROM fit_ticks WHERE day = ? AND done", rs -> {
                ticks.get(d).add(rs.getString("item"));
            }, Date.valueOf(d));
        }
    }

    /** Re-reads upcoming reminders (call after the app syncs its schedule). */
    public void reloadReminders() {
        Instant now = Instant.now();
        List<Reminder> rows = db.query(
                "SELECT day, item, kind, fire_at, title, body FROM fit_reminders WHERE fire_at > ? AND fire_at < ? ORDER BY fire_at",
                (rs, i) -> new Reminder(rs.getDate("day").toLocalDate(), rs.getString("item"), rs.getString("kind"),
                        rs.getTimestamp("fire_at").toInstant(), rs.getString("title"), rs.getString("body")),
                Timestamp.from(now.minus(CATCH_UP)), Timestamp.from(now.plus(Duration.ofDays(15))));
        upcoming.clear();
        upcoming.addAll(rows);
    }

    /** Keeps the in-memory copy of today's ticks in step with what the app saved. */
    public void setTicks(LocalDate day, Set<String> items) {
        Set<String> s = ConcurrentHashMap.newKeySet();
        s.addAll(items);
        ticks.put(day, s);
    }

    /** Sends every reminder that is due. Returns how many were sent. */
    public synchronized int fireDue() {
        Instant now = Instant.now();
        // Right after a restart, don't resend reminders from before it started
        Instant from = startedAt.isAfter(now.minus(CATCH_UP)) ? startedAt.minus(Duration.ofMinutes(2)) : now.minus(CATCH_UP);
        int n = 0;
        for (Reminder r : upcoming) {
            if (r.fireAt().isAfter(now)) break;
            if (r.fireAt().isBefore(from) || sent.contains(r.key())) continue;
            sent.add(r.key());
            if ("late".equals(r.kind()) && isDone(r.day(), r.item())) continue;
            try {
                n += push.sendAll(r.title(), r.body(), r.day() + "-" + r.item() + "-" + r.kind()) > 0 ? 1 : 0;
            } catch (RuntimeException e) {
                log.warn("Reminder {} failed: {}", r.key(), e.getMessage());
            }
        }
        upcoming.removeIf(r -> r.fireAt().isBefore(now.minus(CATCH_UP)));
        if (sent.size() > 5000) sent.clear();
        return n;
    }

    private boolean isDone(LocalDate day, String item) {
        Set<String> s = ticks.getOrDefault(day, Set.of());
        if ("gym".equals(item)) return s.stream().anyMatch(x -> x.startsWith("g") && x.contains(":"));
        return s.contains(item);
    }
}
