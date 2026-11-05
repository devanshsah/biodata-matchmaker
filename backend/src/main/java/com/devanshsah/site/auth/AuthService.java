package com.devanshsah.site.auth;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseCookie;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import com.devanshsah.site.common.SecretStore;

/** Email + password accounts with a signed session cookie (no server-side session store). */
@Service
public class AuthService {
    public static final String COOKIE = "ds_session";
    private static final Duration TTL = Duration.ofDays(180);
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder B64D = Base64.getUrlDecoder();

    private final JdbcTemplate db;
    private final BCryptPasswordEncoder encoder = new BCryptPasswordEncoder();
    private final byte[] key;

    public AuthService(JdbcTemplate db, SecretStore secrets, @Value("${app.session-secret:}") String configured) {
        this.db = db;
        String secret = configured;
        if (secret == null || secret.isBlank()) {
            secret = secrets.get("session_secret").orElseGet(() -> {
                byte[] b = new byte[32];
                new SecureRandom().nextBytes(b);
                String s = HexFormat.of().formatHex(b);
                secrets.put("session_secret", s);
                return s;
            });
        }
        this.key = secret.getBytes(StandardCharsets.UTF_8);
    }

    public record User(UUID id, String email, String role, String displayName) {
        public boolean isAdmin() {
            return "admin".equals(role);
        }
    }

    /* ---------- accounts ---------- */

    public boolean hasAdmin() {
        Boolean b = db.queryForObject("SELECT EXISTS (SELECT 1 FROM users WHERE role = 'admin')", Boolean.class);
        return Boolean.TRUE.equals(b);
    }

    public User createUser(String email, String password, String role) {
        UUID id = db.queryForObject(
                "INSERT INTO users (email, password_hash, display_name, role) VALUES (?, ?, ?, ?) RETURNING id",
                UUID.class, email, encoder.encode(password), email, role);
        return new User(id, email, role, email);
    }

    public Optional<User> checkPassword(String email, String password) {
        List<Object[]> rows = db.query("SELECT id, email, role, display_name, password_hash FROM users WHERE email = ?",
                (rs, i) -> new Object[] { rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("role"),
                        rs.getString("display_name"), rs.getString("password_hash") },
                email);
        if (rows.isEmpty()) {
            encoder.matches(password, "$2a$10$7EqJtq98hPqEX7fNZaFWoOhi5BWX4Z3XY7ZsQe5a3/3s4lJJHqH6e"); // even out timing
            return Optional.empty();
        }
        Object[] r = rows.get(0);
        if (!encoder.matches(password, (String) r[4])) return Optional.empty();
        return Optional.of(new User((UUID) r[0], (String) r[1], (String) r[2], (String) r[3]));
    }

    public Optional<User> findById(UUID id) {
        List<User> rows = db.query("SELECT id, email, role, display_name FROM users WHERE id = ?",
                (rs, i) -> new User(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("role"), rs.getString("display_name")),
                id);
        return rows.stream().findFirst();
    }

    /* ---------- session cookie ---------- */

    public ResponseCookie sessionCookie(User user, boolean secure) {
        long exp = Instant.now().plus(TTL).getEpochSecond();
        String payload = user.id() + "." + exp;
        String token = B64.encodeToString(payload.getBytes(StandardCharsets.UTF_8)) + "." + B64.encodeToString(hmac(payload));
        return ResponseCookie.from(COOKIE, token).httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(TTL).build();
    }

    public ResponseCookie clearCookie(boolean secure) {
        return ResponseCookie.from(COOKIE, "").httpOnly(true).secure(secure).sameSite("Lax").path("/").maxAge(0).build();
    }

    public Optional<User> fromRequest(HttpServletRequest req) {
        Cookie[] cookies = req.getCookies();
        if (cookies == null) return Optional.empty();
        for (Cookie c : cookies) {
            if (COOKIE.equals(c.getName())) return verify(c.getValue());
        }
        return Optional.empty();
    }

    private Optional<User> verify(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2) return Optional.empty();
            String payload = new String(B64D.decode(parts[0]), StandardCharsets.UTF_8);
            if (!MessageDigest.isEqual(hmac(payload), B64D.decode(parts[1]))) return Optional.empty();
            String[] p = payload.split("\\.");
            if (Long.parseLong(p[1]) < Instant.now().getEpochSecond()) return Optional.empty();
            return findById(UUID.fromString(p[0]));
        } catch (RuntimeException e) {
            return Optional.empty();
        }
    }

    private byte[] hmac(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(key, "HmacSHA256"));
            return mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }
}
