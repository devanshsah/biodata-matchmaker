package com.devanshsah.site.fit;

import java.sql.Date;
import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Every 30 seconds: sends reminders that are due. "start" reminders always go out;
 * "late" (off-track) reminders only go out if the task still isn't ticked.
 */
@Component
public class ReminderScheduler {
    private final JdbcTemplate db;
    private final PushSender push;

    public ReminderScheduler(JdbcTemplate db, PushSender push) {
        this.db = db;
        this.push = push;
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 15_000)
    public void sendDue() {
        List<Map<String, Object>> due = db.queryForList(
                "SELECT id, day, item, kind, title, body FROM fit_reminders "
                        + "WHERE sent_at IS NULL AND fire_at <= now() AND fire_at > now() - interval '10 minutes' ORDER BY fire_at");
        for (Map<String, Object> r : due) {
            long id = ((Number) r.get("id")).longValue();
            // Mark first so a slow push never sends twice
            if (db.update("UPDATE fit_reminders SET sent_at = now() WHERE id = ? AND sent_at IS NULL", id) == 0) continue;
            Date day = (Date) r.get("day");
            String item = (String) r.get("item");
            if ("late".equals(r.get("kind")) && isDone(day, item)) continue;
            push.sendAll((String) r.get("title"), (String) r.get("body"), day + "-" + item + "-" + r.get("kind"));
        }
    }

    @Scheduled(cron = "0 15 3 * * *", zone = "Asia/Kolkata")
    public void cleanUp() {
        db.update("DELETE FROM fit_reminders WHERE day < current_date - 30");
    }

    private boolean isDone(Date day, String item) {
        String sql = "gym".equals(item)
                ? "SELECT EXISTS (SELECT 1 FROM fit_ticks WHERE day = ? AND done AND item LIKE 'g%:%')"
                : "SELECT EXISTS (SELECT 1 FROM fit_ticks WHERE day = ? AND done AND item = ?)";
        Boolean b = "gym".equals(item) ? db.queryForObject(sql, Boolean.class, day) : db.queryForObject(sql, Boolean.class, day, item);
        return Boolean.TRUE.equals(b);
    }
}
