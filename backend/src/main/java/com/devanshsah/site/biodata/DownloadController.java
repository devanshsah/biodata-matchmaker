package com.devanshsah.site.biodata;

import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import com.devanshsah.site.common.ApiErrors;

/** Visitors who view or download the biodata (public insert, admin read/delete). */
@RestController
public class DownloadController {
    private final JdbcTemplate db;

    public DownloadController(JdbcTemplate db) {
        this.db = db;
    }

    public record NewDownload(String name, String email, String phone, String message, String action, String userAgent) {}

    @PostMapping("/api/downloads")
    public Map<String, Object> create(@RequestBody NewDownload d) {
        String name = trim(d.name()), email = trim(d.email()), phone = trim(d.phone()), message = trim(d.message());
        if (name.length() < 2 || name.length() > 100) throw ApiErrors.bad("Please enter your name");
        if (email.length() > 255 || !email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw ApiErrors.bad("Please enter a valid email");
        if (phone.length() < 10 || phone.length() > 30) throw ApiErrors.bad("Please enter your phone number");
        if (message.length() > 500) throw ApiErrors.bad("Message is too long");
        String action = "download".equals(d.action()) ? "download" : "view";
        String ua = d.userAgent() == null ? null : d.userAgent().substring(0, Math.min(500, d.userAgent().length()));
        db.update("INSERT INTO downloads (name, email, phone, message, action, user_agent) VALUES (?, ?, ?, ?, ?, ?)",
                name, email, phone, message.isEmpty() ? null : message, action, ua);
        return Map.of("ok", true);
    }

    @GetMapping("/api/admin/downloads")
    public List<Map<String, Object>> list() {
        return db.query("SELECT id, name, email, phone, message, action, created_at FROM downloads ORDER BY created_at DESC",
                (rs, i) -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", rs.getObject("id", UUID.class).toString());
                    m.put("name", rs.getString("name"));
                    m.put("email", rs.getString("email"));
                    m.put("phone", rs.getString("phone"));
                    m.put("message", rs.getString("message"));
                    m.put("action", rs.getString("action"));
                    m.put("created_at", rs.getObject("created_at", OffsetDateTime.class).toString());
                    return m;
                });
    }

    @DeleteMapping("/api/admin/downloads/{id}")
    public Map<String, Object> delete(@PathVariable UUID id) {
        db.update("DELETE FROM downloads WHERE id = ?", id);
        return Map.of("ok", true);
    }

    private static String trim(String s) {
        return s == null ? "" : s.trim();
    }
}
