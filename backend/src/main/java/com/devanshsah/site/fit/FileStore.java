package com.devanshsah.site.fit;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

/** Scan report files, kept in PostgreSQL (works on hosts with no persistent disk). */
@Service
public class FileStore {
    private static final Map<String, String> EXT = Map.of("image/jpeg", ".jpg", "image/png", ".png", "image/webp", ".webp",
            "image/heic", ".heic", "image/gif", ".gif", "application/pdf", ".pdf");
    private final JdbcTemplate db;

    public FileStore(JdbcTemplate db) {
        this.db = db;
    }

    public record StoredFile(String contentType, byte[] data) {}

    /** Saves the file and returns its name. */
    public String save(byte[] data, String contentType) {
        byte[] rnd = new byte[4];
        new SecureRandom().nextBytes(rnd);
        String name = System.currentTimeMillis() + "-" + HexFormat.of().formatHex(rnd) + EXT.getOrDefault(contentType, "");
        db.update("INSERT INTO fit_files (name, content_type, data) VALUES (?, ?, ?)", name, contentType, data);
        return name;
    }

    public Optional<StoredFile> get(String name) {
        List<StoredFile> rows = db.query("SELECT content_type, data FROM fit_files WHERE name = ?",
                (rs, i) -> new StoredFile(rs.getString("content_type"), rs.getBytes("data")), name);
        return rows.stream().findFirst();
    }

    public void delete(String name) {
        if (name != null) db.update("DELETE FROM fit_files WHERE name = ?", name);
    }
}
