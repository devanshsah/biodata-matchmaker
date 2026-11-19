package com.devanshsah.site.fit;

import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.devanshsah.site.common.ApiErrors;

/** Meme lines for reminder notifications. Admin-only (everything under /api/fit is). */
@RestController
@RequestMapping("/api/fit/memes")
public class MemeController {
    static final Set<String> MOMENTS = Set.of("late", "start", "gym", "walk", "wake", "meal", "study", "sleep");

    public record Meme(Long id, String text, String moment, Boolean active) {}

    private final JdbcTemplate db;

    public MemeController(JdbcTemplate db) {
        this.db = db;
    }

    static List<Map<String, Object>> list(JdbcTemplate db) {
        return db.queryForList("SELECT id, text, moment, active FROM fit_memes ORDER BY moment, id");
    }

    @GetMapping
    public List<Map<String, Object>> all() {
        return list(db);
    }

    @PostMapping
    public Map<String, Object> add(@RequestBody Meme m) {
        Meme v = check(m);
        Long id = db.queryForObject("INSERT INTO fit_memes (text, moment, active) VALUES (?, ?, ?) RETURNING id", Long.class,
                v.text(), v.moment(), v.active() == null || v.active());
        return Map.of("id", id);
    }

    @PutMapping("/{id}")
    public Map<String, Object> update(@PathVariable long id, @RequestBody Meme m) {
        Meme v = check(m);
        int n = db.update("UPDATE fit_memes SET text = ?, moment = ?, active = ? WHERE id = ?",
                v.text(), v.moment(), v.active() == null || v.active(), id);
        if (n == 0) throw new ResponseStatusException(HttpStatus.NOT_FOUND, "No such meme");
        return Map.of("ok", true);
    }

    @DeleteMapping("/{id}")
    public Map<String, Object> delete(@PathVariable long id) {
        db.update("DELETE FROM fit_memes WHERE id = ?", id);
        return Map.of("ok", true);
    }

    private static Meme check(Meme m) {
        if (m == null || m.text() == null || m.text().isBlank()) throw ApiErrors.bad("Write the meme line first");
        String text = m.text().strip();
        if (text.length() > 300) throw ApiErrors.bad("Keep it under 300 characters (notifications cut off anyway)");
        String moment = m.moment() == null ? "late" : m.moment();
        if (!MOMENTS.contains(moment)) throw ApiErrors.bad("Unknown moment");
        return new Meme(m.id(), text, moment, m.active());
    }
}
