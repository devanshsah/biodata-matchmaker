package com.devanshsah.site.common;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;

/**
 * Lets DATABASE_URL be pasted exactly as Neon (or most hosts) show it:
 *   postgresql://user:password@host/dbname?sslmode=require
 * and turns it into the JDBC URL, username and password Spring needs.
 * A jdbc:postgresql://... URL is left alone.
 */
public class DatabaseUrlFix implements EnvironmentPostProcessor {
    @Override
    public void postProcessEnvironment(ConfigurableEnvironment env, SpringApplication app) {
        String raw = env.getProperty("DATABASE_URL");
        if (raw == null || !(raw.startsWith("postgres://") || raw.startsWith("postgresql://"))) return;
        URI u = URI.create(raw.replaceFirst("^postgres(ql)?://", "http://"));
        // libpq's channel_binding isn't a JDBC option; drop it and keep the rest (e.g. sslmode=require)
        String query = u.getRawQuery() == null ? "" : String.join("&",
                java.util.Arrays.stream(u.getRawQuery().split("&")).filter(p -> !p.startsWith("channel_binding=")).toList());
        String jdbc = "jdbc:postgresql://" + u.getHost() + (u.getPort() > 0 ? ":" + u.getPort() : "") + u.getRawPath()
                + (query.isEmpty() ? "" : "?" + query);
        Map<String, Object> props = new HashMap<>();
        props.put("spring.datasource.url", jdbc);
        String info = u.getRawUserInfo();
        if (info != null) {
            String[] parts = info.split(":", 2);
            props.put("spring.datasource.username", URLDecoder.decode(parts[0], StandardCharsets.UTF_8));
            if (parts.length > 1) props.put("spring.datasource.password", URLDecoder.decode(parts[1], StandardCharsets.UTF_8));
        }
        env.getPropertySources().addFirst(new MapPropertySource("databaseUrlFix", props));
    }
}
