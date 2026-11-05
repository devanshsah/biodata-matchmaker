package com.devanshsah.site.fit;

import java.io.IOException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeParseException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import com.devanshsah.site.common.ApiErrors;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Fitness planner API. Admin only (enforced by AuthFilter). */
@RestController
@RequestMapping("/api/fit")
public class FitController {
    private static final Set<String> IMAGE_TYPES = Set.of("image/jpeg", "image/png", "image/webp", "image/gif");

    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final PushSender push;
    private final ScanReader reader;
    private final FileStore files;
    private final ReminderEngine reminders;
    private final ZoneId zone;

    public FitController(JdbcTemplate db, ObjectMapper json, PushSender push, ScanReader reader, FileStore files,
                         ReminderEngine reminders, @Value("${app.zone}") String zone) {
        this.db = db;
        this.json = json;
        this.push = push;
        this.reader = reader;
        this.files = files;
        this.reminders = reminders;
        this.zone = ZoneId.of(zone);
    }

    /* ---------- everything the app needs on open ---------- */

    @GetMapping("/state")
    public Map<String, Object> state() throws IOException {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("overrides", overrides());
        Map<String, Map<String, Boolean>> ticks = new LinkedHashMap<>();
        db.query("SELECT day, item FROM fit_ticks WHERE done AND day >= ? ORDER BY day", rs -> {
            ticks.computeIfAbsent(rs.getDate("day").toString(), k -> new LinkedHashMap<>()).put(rs.getString("item"), true);
        }, java.sql.Date.valueOf(LocalDate.now(zone).minusDays(14)));
        out.put("ticks", ticks);
        Map<String, String> kg = new LinkedHashMap<>();
        db.query("SELECT exercise, kg FROM fit_lift_weights", rs -> {
            kg.put(rs.getString("exercise"), rs.getString("kg"));
        });
        out.put("kg", kg);
        out.put("scans", scans());
        out.put("aiRead", reader.enabled());
        out.put("vapidPublicKey", push.publicKey());
        return out;
    }

    private JsonNode overrides() throws IOException {
        List<String> rows = db.queryForList("SELECT data::text FROM fit_overrides WHERE id = 1", String.class);
        return json.readTree(rows.isEmpty() ? "{}" : rows.get(0));
    }

    /* ---------- plan edits ---------- */

    @PutMapping("/overrides")
    public Map<String, Object> saveOverrides(@RequestBody JsonNode body) throws IOException {
        if (body == null || !body.isObject()) throw ApiErrors.bad("Expected an object");
        db.update("INSERT INTO fit_overrides (id, data) VALUES (1, ?::jsonb) "
                + "ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = now()", json.writeValueAsString(body));
        return Map.of("ok", true);
    }

    /* ---------- ticks: one row per ticked task or gym set ---------- */

    @PutMapping("/ticks/{day}")
    @Transactional
    public Map<String, Object> saveTicks(@PathVariable String day, @RequestBody Map<String, Boolean> items) {
        LocalDate ld = parseDay(day);
        java.sql.Date d = java.sql.Date.valueOf(ld);
        db.update("DELETE FROM fit_ticks WHERE day = ?", d);
        Set<String> done = new java.util.HashSet<>();
        for (Map.Entry<String, Boolean> e : items.entrySet()) {
            if (Boolean.TRUE.equals(e.getValue()) && e.getKey().length() <= 40) {
                db.update("INSERT INTO fit_ticks (day, item, done) VALUES (?, ?, TRUE)", d, e.getKey());
                done.add(e.getKey());
            }
        }
        reminders.setTicks(ld, done);
        return Map.of("ok", true);
    }

    /* ---------- weights used per exercise ---------- */

    public record Kg(String name, String value) {}

    @PutMapping("/kg")
    @Transactional
    public Map<String, Object> saveKg(@RequestBody Kg kg) {
        if (kg.name() == null || kg.name().isBlank()) throw ApiErrors.bad("Missing exercise name");
        String v = kg.value() == null ? "" : kg.value().trim();
        if (v.isEmpty()) {
            db.update("DELETE FROM fit_lift_weights WHERE exercise = ?", kg.name());
        } else {
            v = v.substring(0, Math.min(20, v.length()));
            db.update("INSERT INTO fit_lift_weights (exercise, kg) VALUES (?, ?) "
                    + "ON CONFLICT (exercise) DO UPDATE SET kg = EXCLUDED.kg, updated_at = now()", kg.name(), v);
            db.update("INSERT INTO fit_lift_log (exercise, kg) VALUES (?, ?)", kg.name(), v);
        }
        return Map.of("ok", true);
    }

    /* ---------- body scans ---------- */

    @GetMapping("/scans")
    public List<Map<String, Object>> scans() {
        return db.query("SELECT day, time_of_day, weight, fat, pbf, smm, vfa, waist, image FROM fit_scans ORDER BY day", (rs, i) -> {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("date", rs.getDate("day").toString());
            m.put("time", rs.getString("time_of_day"));
            for (String f : List.of("weight", "fat", "pbf", "smm", "vfa", "waist")) {
                BigDecimal v = rs.getBigDecimal(f);
                if (v != null) m.put(f, v.doubleValue());
            }
            if (rs.getString("image") != null) m.put("image", rs.getString("image"));
            return m;
        });
    }

    @PostMapping("/scans")
    public Map<String, Object> saveScan(@RequestParam("data") String data,
                                        @RequestParam(value = "file", required = false) MultipartFile file) throws IOException {
        if (file != null && file.getSize() > 15 * 1024 * 1024) throw ApiErrors.bad("File is too big (max 15 MB)");
        JsonNode r = json.readTree(data);
        LocalDate day = parseDay(r.path("date").asText(""));
        String time = "morning".equals(r.path("time").asText()) ? "morning" : "evening";
        String image = null;
        if (file != null && !file.isEmpty()) {
            String type = file.getContentType() == null ? "" : file.getContentType();
            if (!type.startsWith("image/") && !type.equals("application/pdf")) throw ApiErrors.bad("Upload a photo or a PDF");
            image = files.save(file.getBytes(), type);
        }
        List<String> old = db.queryForList("SELECT image FROM fit_scans WHERE day = ? AND image IS NOT NULL", String.class, java.sql.Date.valueOf(day));
        db.update("INSERT INTO fit_scans (day, time_of_day, weight, fat, pbf, smm, vfa, waist, image) VALUES (?,?,?,?,?,?,?,?,?) "
                        + "ON CONFLICT (day) DO UPDATE SET time_of_day = EXCLUDED.time_of_day, weight = EXCLUDED.weight, fat = EXCLUDED.fat, "
                        + "pbf = EXCLUDED.pbf, smm = EXCLUDED.smm, vfa = EXCLUDED.vfa, waist = EXCLUDED.waist, "
                        + "image = COALESCE(EXCLUDED.image, fit_scans.image), updated_at = now()",
                java.sql.Date.valueOf(day), time, num(r, "weight"), num(r, "fat"), num(r, "pbf"), num(r, "smm"), num(r, "vfa"), num(r, "waist"), image);
        if (image != null && !old.isEmpty()) files.delete(old.get(0));
        return Map.of("ok", true);
    }

    @DeleteMapping("/scans/{day}")
    public Map<String, Object> deleteScan(@PathVariable String day) {
        java.sql.Date d = java.sql.Date.valueOf(parseDay(day));
        List<String> old = db.queryForList("SELECT image FROM fit_scans WHERE day = ? AND image IS NOT NULL", String.class, d);
        db.update("DELETE FROM fit_scans WHERE day = ?", d);
        if (!old.isEmpty()) files.delete(old.get(0));
        return Map.of("ok", true);
    }

    @PostMapping("/scans/read")
    public JsonNode readScan(@RequestParam("image") MultipartFile image) {
        if (!reader.enabled()) throw ApiErrors.bad("Photo reading is off. Set ANTHROPIC_API_KEY.");
        if (image.getSize() > 5 * 1024 * 1024 || !IMAGE_TYPES.contains(image.getContentType())) throw ApiErrors.bad("Send a JPEG or PNG photo under 5 MB");
        try {
            return reader.read(image.getBytes(), image.getContentType());
        } catch (Exception e) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Couldn’t read the photo");
        }
    }

    /* ---------- reminders ---------- */

    public record ReminderItem(String day, String item, String kind, int minute, String title, String body) {}
    public record ReminderSync(String from, List<ReminderItem> items) {}

    /** The app sends the next 14 days of its schedule; unsent reminders from that date on are replaced. */
    @PutMapping("/reminders")
    @Transactional
    public Map<String, Object> syncReminders(@RequestBody ReminderSync sync) {
        java.sql.Date from = java.sql.Date.valueOf(parseDay(sync.from()));
        db.update("DELETE FROM fit_reminders WHERE day >= ?", from);
        int n = 0;
        for (ReminderItem it : sync.items() == null ? List.<ReminderItem>of() : sync.items()) {
            if (!"start".equals(it.kind()) && !"late".equals(it.kind())) continue;
            LocalDate d = parseDay(it.day());
            java.sql.Timestamp fire = java.sql.Timestamp.from(d.atStartOfDay(zone).plusMinutes(it.minute()).toInstant());
            n += db.update("INSERT INTO fit_reminders (day, item, kind, fire_at, title, body) VALUES (?, ?, ?, ?, ?, ?) "
                            + "ON CONFLICT (day, item, kind) DO NOTHING",
                    java.sql.Date.valueOf(d), cut(it.item(), 40), it.kind(), fire, cut(it.title(), 200), cut(it.body(), 500));
        }
        reminders.reloadReminders();
        return Map.of("ok", true, "scheduled", n);
    }

    public record Keys(String p256dh, String auth) {}
    public record Subscription(String endpoint, Keys keys) {}

    @PostMapping("/push/subscribe")
    public Map<String, Object> subscribe(@RequestBody Subscription s) {
        if (s == null || s.endpoint() == null || s.keys() == null || s.keys().p256dh() == null || s.keys().auth() == null) {
            throw ApiErrors.bad("Bad subscription");
        }
        push.subscribe(s.endpoint(), s.keys().p256dh(), s.keys().auth());
        return Map.of("ok", true);
    }

    @PostMapping("/push/test")
    public Map<String, Object> testPush() {
        int sent = push.sendAll("Reminders are working", "You’ll get a nudge at the start of each task.", "test");
        return Map.of("sent", sent);
    }

    /* ---------- helpers ---------- */

    private static LocalDate parseDay(String s) {
        try {
            return LocalDate.parse(s);
        } catch (DateTimeParseException | NullPointerException e) {
            throw ApiErrors.bad("Bad date");
        }
    }

    private static BigDecimal num(JsonNode r, String f) {
        JsonNode v = r.get(f);
        if (v == null || v.isNull() || v.asText().isBlank()) return null;
        try {
            return new BigDecimal(v.asText());
        } catch (NumberFormatException e) {
            return null;
        }
    }

    private static String cut(String s, int max) {
        return s == null ? null : s.substring(0, Math.min(max, s.length()));
    }
}
