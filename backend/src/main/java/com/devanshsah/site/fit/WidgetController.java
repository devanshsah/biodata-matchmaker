package com.devanshsah.site.fit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.HexFormat;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.devanshsah.site.common.ApiErrors;
import com.devanshsah.site.common.SecretStore;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Home-screen widget (Scriptable on iPhone). The app syncs each day's plan here; the widget reads a
 * small read-only summary with a private key. Nothing here can change data.
 */
@RestController
public class WidgetController {
    private static final double PROTEIN_GOAL = 120.0;

    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final SecretStore secrets;
    private final ZoneId zone;

    public WidgetController(JdbcTemplate db, ObjectMapper json, SecretStore secrets, @Value("${app.zone}") String zone) {
        this.db = db;
        this.json = json;
        this.secrets = secrets;
        this.zone = ZoneId.of(zone);
    }

    /* ---------- admin: sync the plan, get the key ---------- */

    @PutMapping("/api/fit/dayplan")
    @Transactional
    public Map<String, Object> saveDayPlan(@RequestBody JsonNode body) throws Exception {
        JsonNode days = body == null ? null : body.get("days");
        if (days == null || !days.isObject() || days.size() > 120) throw ApiErrors.bad("Bad day plan");
        Iterator<Map.Entry<String, JsonNode>> it = days.fields();
        int n = 0;
        while (it.hasNext()) {
            Map.Entry<String, JsonNode> e = it.next();
            LocalDate d;
            try { d = LocalDate.parse(e.getKey()); } catch (Exception ex) { throw ApiErrors.bad("Bad date"); }
            if (!e.getValue().isArray()) throw ApiErrors.bad("Bad items");
            db.update("INSERT INTO fit_dayplan (day, items) VALUES (?, ?::jsonb) ON CONFLICT (day) DO UPDATE SET items = EXCLUDED.items, updated_at = now()",
                    java.sql.Date.valueOf(d), json.writeValueAsString(e.getValue()));
            n++;
        }
        db.update("DELETE FROM fit_dayplan WHERE day < ?", java.sql.Date.valueOf(LocalDate.now(zone).minusDays(90)));
        return Map.of("ok", true, "days", n);
    }

    @GetMapping("/api/fit/widget-key")
    public Map<String, Object> widgetKey() {
        return Map.of("key", key());
    }

    @PostMapping("/api/fit/widget-key/rotate")
    public Map<String, Object> rotateKey() {
        String k = newKey();
        secrets.put("widget_key", k);
        return Map.of("key", k);
    }

    private String key() {
        return secrets.get("widget_key").orElseGet(() -> {
            String k = newKey();
            secrets.put("widget_key", k);
            return k;
        });
    }

    private static String newKey() {
        byte[] b = new byte[24];
        new SecureRandom().nextBytes(b);
        return HexFormat.of().formatHex(b);
    }

    /* ---------- public, read-only: what the widget shows ---------- */

    @GetMapping("/api/widget")
    public ResponseEntity<Map<String, Object>> widget(@RequestParam("key") String given) throws Exception {
        if (!MessageDigest.isEqual(key().getBytes(StandardCharsets.UTF_8), String.valueOf(given).getBytes(StandardCharsets.UTF_8)))
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Bad key");
        ZonedDateTime now = ZonedDateTime.now(zone);
        LocalDate today = now.toLocalDate();
        int min = now.getHour() * 60 + now.getMinute();

        List<JsonNode> items = itemsOf(today);
        Set<String> done = doneOf(today);
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("date", today.toString());
        out.put("time", String.format("%d:%02d %s", (now.getHour() + 11) % 12 + 1, now.getMinute(), now.getHour() < 12 ? "am" : "pm"));
        if (items.isEmpty()) {
            out.put("empty", true);
            out.put("message", "Open the app once to sync today’s plan.");
            return ok(out);
        }

        JsonNode cur = null, next = null;
        int behind = 0, got = 0, total = 0;
        for (JsonNode x : items) {
            int m = x.path("m").asInt(), end = x.path("end").asInt(m + 30);
            boolean counts = x.path("counts").asBoolean(true), isDone = isDone(x, done);
            if (counts) { total++; if (isDone) got++; }
            if (m <= min && end > min && !isDone && counts) cur = cur == null ? x : cur;
            if (m > min && next == null) next = x;
            if (counts && !isDone && end <= min) behind++;
        }
        if (cur == null) { // nothing open right now: show the last thing that started
            for (JsonNode x : items) if (x.path("m").asInt() <= min && !"sleep".equals(x.path("id").asText())) cur = x;
            if (cur != null && isDone(cur, done)) cur = null;
        }
        out.put("now", cur == null ? null : brief(cur, isDone(cur, done)));
        out.put("next", next == null ? null : brief(next, isDone(next, done)));
        out.put("behind", behind);
        out.put("got", got);
        out.put("total", total);
        out.put("day", total == 0 ? 0 : (double) got / total);
        out.put("effort", effort(items, done));
        double protein = 0;
        for (JsonNode x : items) if ("food".equals(x.path("kind").asText()) && done.contains(x.path("id").asText())) protein += x.path("p").asDouble();
        out.put("protein", (int) protein);
        out.put("fuel", Math.min(1.0, protein / PROTEIN_GOAL));
        out.put("streak", streak(today));
        return ok(out);
    }

    private static ResponseEntity<Map<String, Object>> ok(Map<String, Object> body) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(body);
    }

    private static Map<String, Object> brief(JsonNode x, boolean done) {
        Map<String, Object> b = new LinkedHashMap<>();
        b.put("id", x.path("id").asText());
        b.put("title", x.path("title").asText());
        b.put("kind", x.path("kind").asText());
        b.put("m", x.path("m").asInt());
        b.put("end", x.path("end").asInt());
        b.put("done", done);
        return b;
    }

    private List<JsonNode> itemsOf(LocalDate d) throws Exception {
        List<String> rows = db.queryForList("SELECT items::text FROM fit_dayplan WHERE day = ?", String.class, java.sql.Date.valueOf(d));
        List<JsonNode> list = new ArrayList<>();
        if (!rows.isEmpty()) json.readTree(rows.get(0)).forEach(list::add);
        list.sort((a, b) -> Integer.compare(a.path("m").asInt(), b.path("m").asInt()));
        return list;
    }

    private Set<String> doneOf(LocalDate d) {
        return new HashSet<>(db.queryForList("SELECT item FROM fit_ticks WHERE day = ? AND done", String.class, java.sql.Date.valueOf(d)));
    }

    private static boolean isDone(JsonNode x, Set<String> done) {
        String id = x.path("id").asText();
        if ("gym".equals(id)) return done.contains("gym") || done.stream().anyMatch(s -> s.matches("g\\d+:\\d+"));
        return done.contains(id);
    }

    private static double effort(List<JsonNode> items, Set<String> done) {
        double e = (done.contains("walk") ? 4 : 0) + (done.contains("eve") ? 6 : 0) + (done.contains("core") ? 1.5 : 0);
        for (JsonNode x : items) {
            if (!"gym".equals(x.path("id").asText())) continue;
            int sets = x.path("sets").asInt(0);
            long ticked = done.stream().filter(s -> s.matches("g\\d+:\\d+")).count();
            if (sets > 0 && ticked > 0) e += 11.0 * Math.min(1.0, (double) ticked / sets);
            else if (done.contains("gym")) e += 11;
        }
        return Math.round(Math.min(21, e) * 10) / 10.0;
    }

    /** Same rule as the app: consecutive days at 70%+ (today counts once it gets there). Two queries total. */
    private int streak(LocalDate today) throws Exception {
        java.sql.Date from = java.sql.Date.valueOf(today.minusDays(60));
        Map<LocalDate, JsonNode> plans = new java.util.HashMap<>();
        db.query("SELECT day, items::text AS items FROM fit_dayplan WHERE day >= ?", rs -> {
            try { plans.put(rs.getDate("day").toLocalDate(), json.readTree(rs.getString("items"))); } catch (Exception ignored) { }
        }, from);
        Map<LocalDate, Set<String>> ticks = new java.util.HashMap<>();
        db.query("SELECT day, item FROM fit_ticks WHERE done AND day >= ?", rs -> {
            ticks.computeIfAbsent(rs.getDate("day").toLocalDate(), k -> new HashSet<>()).add(rs.getString("item"));
        }, from);
        int n = 0;
        for (int i = 0; i < 60; i++) {
            LocalDate d = today.minusDays(i);
            JsonNode items = plans.get(d);
            if (items == null) break;
            Set<String> done = ticks.getOrDefault(d, Set.of());
            int got = 0, total = 0;
            for (JsonNode x : items) if (x.path("counts").asBoolean(true)) { total++; if (isDone(x, done)) got++; }
            double pct = total == 0 ? 0 : (double) got / total;
            if (pct >= 0.7) n++;
            else if (i > 0) break;
        }
        return n;
    }
}
