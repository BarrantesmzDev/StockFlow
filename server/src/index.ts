import "dotenv/config";
import express from "express";
import cors from "cors";
import { productosRouter } from "./modules/productos/productos.routes.ts";
import { errorHandler } from "./middlewares/error-handler.ts";

const app = express();
const PORT = process.env.PORT ?? 3000;

// CORS: qué páginas web pueden llamar a esta API desde el navegador.
// En producción CORS_ORIGIN = URL del frontend (ej. https://stockflow.vercel.app).
// Sin CORS_ORIGIN (desarrollo) se acepta cualquier origen.
const origenesPermitidos = process.env.CORS_ORIGIN?.split(",").map((origen) => origen.trim());
app.use(cors(origenesPermitidos ? { origin: origenesPermitidos } : undefined));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "stockflow" });
});

app.use("/api/productos", productosRouter);

// Cualquier ruta que no exista → 404 en JSON (en vez del HTML por defecto de Express)
app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Siempre al final: recibe los errores de todas las rutas
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`StockFlow API corriendo en http://localhost:${PORT}`);
});
