# One image: React site built into the Spring Boot jar, served on port 8080.

# ---- 1. Build the React frontend ----
FROM node:20-alpine AS web
WORKDIR /web
COPY frontend/package.json frontend/package-lock.json ./
# npm ci needs an exact lockfile match; fall back to npm install if the lockfile was changed on another machine
RUN npm ci --no-audit --no-fund || npm install --no-audit --no-fund
COPY frontend/ ./
RUN npm run build

# ---- 2. Build the Spring Boot backend (with the frontend inside) ----
FROM maven:3.9-eclipse-temurin-17 AS api
WORKDIR /api
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
COPY backend/src ./src
COPY --from=web /web/dist ./src/main/resources/static
RUN mvn -q -B package -DskipTests

# ---- 3. Run ----
FROM eclipse-temurin:17-jre
ENV TZ=Asia/Kolkata \
    UPLOAD_DIR=/data/uploads \
    JAVA_OPTS="-XX:MaxRAMPercentage=75"
RUN useradd --system --uid 10001 app && mkdir -p /data/uploads && chown -R app /data
WORKDIR /app
COPY --from=api /api/target/site.jar ./site.jar
USER app
VOLUME ["/data"]
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD bash -c 'exec 3<>/dev/tcp/127.0.0.1/8080' || exit 1
ENTRYPOINT ["sh", "-c", "exec java $JAVA_OPTS -jar /app/site.jar"]
