package com.devanshsah.site.fit;

import java.math.BigInteger;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.SecureRandom;
import java.security.Security;
import java.util.Base64;
import java.util.List;
import java.util.Map;

import org.apache.http.HttpResponse;
import org.bouncycastle.jce.ECNamedCurveTable;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.devanshsah.site.common.SecretStore;
import com.fasterxml.jackson.databind.ObjectMapper;

import nl.martijndwars.webpush.Notification;
import nl.martijndwars.webpush.PushService;

/** Sends Web Push notifications to every subscribed phone or browser. Keys are created on first start. */
@Service
public class PushSender {
    private static final Logger log = LoggerFactory.getLogger(PushSender.class);
    private static final Base64.Encoder B64 = Base64.getUrlEncoder().withoutPadding();

    private final JdbcTemplate db;
    private final ObjectMapper json;
    private final PushService push;
    private final String publicKey;

    public PushSender(JdbcTemplate db, ObjectMapper json, SecretStore secrets,
                      @Value("${app.vapid-subject}") String subject) throws Exception {
        this.db = db;
        this.json = json;
        if (Security.getProvider(BouncyCastleProvider.PROVIDER_NAME) == null) {
            Security.addProvider(new BouncyCastleProvider());
        }
        if (secrets.get("vapid_public").isEmpty()) {
            KeyPairGenerator gen = KeyPairGenerator.getInstance("ECDH", BouncyCastleProvider.PROVIDER_NAME);
            gen.initialize(ECNamedCurveTable.getParameterSpec("prime256v1"), new SecureRandom());
            KeyPair kp = gen.generateKeyPair();
            byte[] pub = ((org.bouncycastle.jce.interfaces.ECPublicKey) kp.getPublic()).getQ().getEncoded(false);
            BigInteger d = ((org.bouncycastle.jce.interfaces.ECPrivateKey) kp.getPrivate()).getD();
            secrets.put("vapid_public", B64.encodeToString(pub));
            secrets.put("vapid_private", B64.encodeToString(fixed32(d.toByteArray())));
        }
        this.publicKey = secrets.get("vapid_public").orElseThrow();
        this.push = new PushService();
        this.push.setPublicKey(publicKey);
        this.push.setPrivateKey(secrets.get("vapid_private").orElseThrow());
        this.push.setSubject(subject);
    }

    public String publicKey() {
        return publicKey;
    }

    public void subscribe(String endpoint, String p256dh, String auth) {
        db.update("INSERT INTO fit_push_subs (endpoint, p256dh, auth) VALUES (?, ?, ?) "
                + "ON CONFLICT (endpoint) DO UPDATE SET p256dh = EXCLUDED.p256dh, auth = EXCLUDED.auth", endpoint, p256dh, auth);
    }

    /** Returns how many devices accepted the notification. */
    public int sendAll(String title, String body, String tag) {
        List<Map<String, Object>> subs = db.queryForList("SELECT endpoint, p256dh, auth FROM fit_push_subs");
        int sent = 0;
        String payload;
        try {
            payload = json.writeValueAsString(Map.of("title", title, "body", body == null ? "" : body, "tag", tag == null ? "" : tag));
        } catch (Exception e) {
            return 0;
        }
        for (Map<String, Object> s : subs) {
            String endpoint = (String) s.get("endpoint");
            try {
                Notification n = new Notification(endpoint, (String) s.get("p256dh"), (String) s.get("auth"),
                        payload.getBytes(StandardCharsets.UTF_8));
                HttpResponse r = push.send(n);
                int code = r.getStatusLine().getStatusCode();
                if (code == 404 || code == 410) {
                    db.update("DELETE FROM fit_push_subs WHERE endpoint = ?", endpoint); // device unsubscribed
                } else if (code >= 200 && code < 300) {
                    sent++;
                } else {
                    log.warn("Push to {} failed with {}", endpoint, code);
                }
            } catch (Exception e) {
                log.warn("Push failed: {}", e.getMessage());
            }
        }
        return sent;
    }

    private static byte[] fixed32(byte[] b) {
        if (b.length == 32) return b;
        byte[] out = new byte[32];
        if (b.length > 32) System.arraycopy(b, b.length - 32, out, 0, 32);
        else System.arraycopy(b, 0, out, 32 - b.length, b.length);
        return out;
    }
}
