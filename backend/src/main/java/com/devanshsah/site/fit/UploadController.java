package com.devanshsah.site.fit;

import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Serves uploaded scan reports to the signed-in admin (AuthFilter guards /uploads/**). */
@RestController
public class UploadController {
    private final FileStore files;

    public UploadController(FileStore files) {
        this.files = files;
    }

    @GetMapping("/uploads/{name}")
    public ResponseEntity<byte[]> get(@PathVariable String name) {
        if (!name.matches("[A-Za-z0-9._-]+")) return ResponseEntity.notFound().build();
        return files.get(name)
                .map(f -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(f.contentType()))
                        .cacheControl(CacheControl.noCache().cachePrivate())
                        .body(f.data()))
                .orElse(ResponseEntity.notFound().build());
    }
}
