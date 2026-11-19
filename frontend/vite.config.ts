import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// Client-side app. The Spring Boot server serves the built files and the /api routes.
// During `npm run dev`, API calls are forwarded to the server on port 8080.
export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  server: {
    port: 5173,
    proxy: { "/api": "http://localhost:8080", "/uploads": "http://localhost:8080" },
  },
  build: { outDir: "dist", sourcemap: false },
});
