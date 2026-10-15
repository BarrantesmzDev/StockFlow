import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // "@/components/..." = "src/components/..." (evita rutas como ../../../)
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
  server: {
    // En desarrollo, todo lo que empiece con /api se reenvía a la API de Express.
    // Así el frontend llama a "/api/productos" sin preocuparse del puerto ni de CORS.
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
});
