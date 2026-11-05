package com.devanshsah.site.fit;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RestController;

/** Serves uploaded scan reports to the signed-in admin (AuthFilter guards /uploads/**). */
@RestController
public class UploadController {
    private final Path uploads;

    public UploadController(@Value("${app.upload-dir}") String uploadDir) {
        this.uploads = Paths.get(uploadDir).toAbsolutePath();
    }

    @GetMapping("/uploads/{name}")
    public ResponseEntity<Resource> get(@PathVariable String name) throws IOException {
        if (!name.matches("[A-Za-z0-9._-]+") || name.startsWith(".")) return ResponseEntity.notFound().build();
        Path file = uploads.resolve(name).normalize();
        if (!file.startsWith(uploads) || !Files.isReadable(file)) return ResponseEntity.notFound().build();
        String type = Files.probeContentType(file);
        return ResponseEntity.ok()
                .contentType(type == null ? MediaType.APPLICATION_OCTET_STREAM : MediaType.parseMediaType(type))
                .cacheControl(CacheControl.noCache().cachePrivate())
                .body(new FileSystemResource(file));
    }
}
