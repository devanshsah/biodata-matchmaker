package com.devanshsah.site.auth;

import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import jakarta.servlet.http.HttpServletRequest;

import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.devanshsah.site.common.ApiErrors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final AuthService auth;
    private final Map<String, Deque<Long>> attempts = new ConcurrentHashMap<>();

    public AuthController(AuthService auth) {
        this.auth = auth;
    }

    public record Credentials(String email, String password) {}

    @GetMapping("/status")
    public Map<String, Object> status() {
        return Map.of("hasAdmin", auth.hasAdmin());
    }

    @GetMapping("/me")
    public ResponseEntity<?> me(HttpServletRequest req) {
        Object u = req.getAttribute(AuthFilter.USER);
        if (!(u instanceof AuthService.User user)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Not signed in"));
        }
        return ResponseEntity.ok(view(user));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Credentials c, HttpServletRequest req) {
        String ip = req.getRemoteAddr();
        rateLimit(ip);
        String email = clean(c.email());
        AuthService.User user = auth.checkPassword(email, c.password() == null ? "" : c.password())
                .orElseThrow(() -> {
                    attempts.computeIfAbsent(ip, k -> new ArrayDeque<>()).add(System.currentTimeMillis());
                    return new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Wrong email or password");
                });
        attempts.remove(ip);
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, auth.sessionCookie(user, req.isSecure()).toString())
                .body(view(user));
    }

    /** Only works until the first (admin) account exists, like the original Supabase setup. */
    @PostMapping("/signup")
    public ResponseEntity<?> signup(@RequestBody Credentials c, HttpServletRequest req) {
        synchronized (this) {
            if (auth.hasAdmin()) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Sign-ups are closed. Sign in instead.");
            }
            String email = clean(c.email());
            if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) throw ApiErrors.bad("Enter a valid email");
            if (c.password() == null || c.password().length() < 6) throw ApiErrors.bad("Password must be at least 6 characters");
            AuthService.User user = auth.createUser(email, c.password(), "admin");
            return ResponseEntity.ok()
                    .header(HttpHeaders.SET_COOKIE, auth.sessionCookie(user, req.isSecure()).toString())
                    .body(view(user));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(HttpServletRequest req) {
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, auth.clearCookie(req.isSecure()).toString())
                .body(Map.of("ok", true));
    }

    private static Map<String, Object> view(AuthService.User u) {
        return Map.of("email", u.email(), "role", u.role(), "displayName", u.displayName() == null ? u.email() : u.displayName());
    }

    private static String clean(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private void rateLimit(String ip) {
        Deque<Long> q = attempts.get(ip);
        if (q == null) return;
        long cutoff = System.currentTimeMillis() - 15 * 60_000L;
        synchronized (q) {
            while (!q.isEmpty() && q.peekFirst() < cutoff) q.pollFirst();
            if (q.size() >= 10) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS, "Too many tries. Wait 15 minutes.");
        }
    }
}
