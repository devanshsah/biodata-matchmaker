package com.devanshsah.site.common;

import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/** Small key/value store for secrets the server generates once (session key, push keys). */
@Component
public class SecretStore {
    private final JdbcTemplate db;

    public SecretStore(JdbcTemplate db) {
        this.db = db;
    }

    public Optional<String> get(String key) {
        List<String> rows = db.queryForList("SELECT value FROM app_secrets WHERE key = ?", String.class, key);
        return rows.stream().findFirst();
    }

    public void put(String key, String value) {
        db.update("INSERT INTO app_secrets (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value", key, value);
    }
}
