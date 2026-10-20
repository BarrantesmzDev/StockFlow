import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // API_PROXY permite apuntar el proxy a otra API (ej. una de pruebas) sin tocar este archivo
  const env = loadEnv(mode, process.cwd(), "");
  return {
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
        "/api": env.API_PROXY || "http://localhost:3000",
      },
    },
  };
});
