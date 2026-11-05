package com.devanshsah.site.auth;

import java.io.IOException;
import java.util.Optional;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * Reads the session cookie on every request. Admin pages, the fitness API and uploaded
 * scan photos need an admin account; everything else (portfolio, biodata form) is public.
 */
@Component
public class AuthFilter extends OncePerRequestFilter {
    public static final String USER = "currentUser";
    private final AuthService auth;

    public AuthFilter(AuthService auth) {
        this.auth = auth;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest req, HttpServletResponse res, FilterChain chain)
            throws ServletException, IOException {
        String path = req.getRequestURI();
        boolean adminOnly = path.startsWith("/api/admin/") || path.startsWith("/api/fit/") || path.startsWith("/uploads/");
        boolean needsUser = path.startsWith("/api/") && adminOnly;

        Optional<AuthService.User> user = (adminOnly || path.startsWith("/api/auth/")) ? auth.fromRequest(req) : Optional.empty();
        user.ifPresent(u -> req.setAttribute(USER, u));

        if (needsUser || adminOnly) {
            if (user.isEmpty()) {
                deny(res, 401, "Sign in first");
                return;
            }
            if (!user.get().isAdmin()) {
                deny(res, 403, "Admins only");
                return;
            }
        }
        chain.doFilter(req, res);
    }

    private void deny(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType("application/json");
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"error\":\"" + message + "\"}");
    }
}
