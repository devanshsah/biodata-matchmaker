package com.devanshsah.site.fit;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/** Optional: reads the numbers off a body-scan report photo using the Claude API. */
@Service
public class ScanReader {
    private static final String PROMPT = "This is a photo of an ACCUNIQ BC380 body composition report. Reply with only a JSON object, "
            + "no other text, with numbers (no units) from the CURRENT test, not the history chart: "
            + "{\"date\":\"YYYY-MM-DD from Test Date/Time\",\"hour\":24h hour of the test,\"weight\":kg,\"fat\":Body Fat kg,"
            + "\"pbf\":PBF percent,\"smm\":SMM kg,\"vfa\":VFA cm2,\"waist\":Abdominal Circumference cm}. Use null for anything unreadable.";

    private final String apiKey;
    private final String model;
    private final ObjectMapper json;
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();

    public ScanReader(@Value("${app.anthropic-api-key:}") String apiKey, @Value("${app.anthropic-model}") String model, ObjectMapper json) {
        this.apiKey = apiKey;
        this.model = model;
        this.json = json;
    }

    public boolean enabled() {
        return apiKey != null && !apiKey.isBlank();
    }

    public JsonNode read(byte[] image, String mediaType) throws Exception {
        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", 400,
                "messages", List.of(Map.of("role", "user", "content", List.of(
                        Map.of("type", "image", "source", Map.of("type", "base64", "media_type", mediaType,
                                "data", Base64.getEncoder().encodeToString(image))),
                        Map.of("type", "text", "text", PROMPT)))));
        HttpRequest req = HttpRequest.newBuilder(URI.create("https://api.anthropic.com/v1/messages"))
                .timeout(Duration.ofSeconds(60))
                .header("x-api-key", apiKey)
                .header("anthropic-version", "2023-06-01")
                .header("content-type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(json.writeValueAsString(body)))
                .build();
        HttpResponse<String> res = http.send(req, HttpResponse.BodyHandlers.ofString());
        if (res.statusCode() != 200) throw new IllegalStateException("Claude API returned " + res.statusCode());
        StringBuilder text = new StringBuilder();
        for (JsonNode c : json.readTree(res.body()).path("content")) {
            if ("text".equals(c.path("type").asText())) text.append(c.path("text").asText());
        }
        Matcher m = Pattern.compile("\\{[\\s\\S]*\\}").matcher(text);
        if (!m.find()) throw new IllegalStateException("No numbers found");
        return json.readTree(m.group());
    }
}
