import "dotenv/config";
import express from "express";
import cors from "cors";
import { productosRouter } from "./modules/productos/productos.routes.ts";
import { errorHandler } from "./middlewares/error-handler.ts";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(cors());
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
