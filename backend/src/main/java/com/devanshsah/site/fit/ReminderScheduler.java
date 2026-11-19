package com.devanshsah.site.fit;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

/**
 * Two ways reminders get sent:
 *  - In Docker the server runs all the time, so a 30-second timer does it.
 *  - On Cloud Run the server only gets CPU during requests, so Cloud Scheduler calls
 *    POST /api/internal/reminders/tick every couple of minutes with the X-Cron-Key header.
 */
@RestController
public class ReminderScheduler {
    private final ReminderEngine engine;
    private final String cronKey;

    public ReminderScheduler(ReminderEngine engine, @Value("${app.cron-key:}") String cronKey) {
        this.engine = engine;
        this.cronKey = cronKey;
    }

    @Scheduled(fixedDelay = 30_000, initialDelay = 20_000)
    public void timer() {
        engine.fireDue();
    }

    @PostMapping("/api/internal/reminders/tick")
    public ResponseEntity<Map<String, Object>> tick(@RequestHeader(value = "X-Cron-Key", required = false) String key) {
        if (cronKey.isBlank() || key == null
                || !MessageDigest.isEqual(cronKey.getBytes(StandardCharsets.UTF_8), key.getBytes(StandardCharsets.UTF_8))) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("error", "Forbidden"));
        }
        return ResponseEntity.ok(Map.of("sent", engine.fireDue()));
    }
}
