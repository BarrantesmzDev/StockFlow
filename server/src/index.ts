import "dotenv/config";
import express from "express";
import cors from "cors";
import { autenticar, consultaSoloLectura, requiereRol } from "./middlewares/auth.ts";
import { errorHandler } from "./middlewares/error-handler.ts";
import { apartadosRouter } from "./modules/apartados/apartados.routes.ts";
import { authRouter } from "./modules/auth/auth.routes.ts";
import { catalogosRouter } from "./modules/catalogos/catalogos.routes.ts";
import { despachosRouter } from "./modules/despachos/despachos.routes.ts";
import { importacionRouter } from "./modules/importacion/importacion.routes.ts";
import { inventarioRouter } from "./modules/inventario/inventario.routes.ts";
import { movimientosRouter } from "./modules/movimientos/movimientos.routes.ts";
import { productosRouter } from "./modules/productos/productos.routes.ts";
import { usuariosRouter } from "./modules/usuarios/usuarios.routes.ts";

const app = express();
const PORT = process.env.PORT ?? 3000;

// CORS: qué páginas web pueden llamar a esta API desde el navegador.
// En producción CORS_ORIGIN = URL del frontend (ej. https://stockflow.vercel.app).
// Sin CORS_ORIGIN o vacía (desarrollo) se acepta cualquier origen.
// Se quita la "/" final porque el navegador manda el origen sin ella.
const origenesPermitidos = (process.env.CORS_ORIGIN ?? "")
  .split(",")
  .map((origen) => origen.trim().replace(/\/+$/, ""))
  .filter(Boolean);
app.use(cors(origenesPermitidos.length > 0 ? { origin: origenesPermitidos } : undefined));
// 10 MB: la importación manda las filas del Excel completas (un catálogo de 800 filas ≈ 100 KB)
app.use(express.json({ limit: "10mb" }));

// ---------- Rutas públicas ----------
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", app: "stockflow" });
});
app.use("/api/auth", authRouter); // login, logout, primera configuración

// ---------- De aquí para abajo, todo exige sesión ----------
app.use("/api", autenticar, consultaSoloLectura);

app.use("/api", catalogosRouter); // /api/ubicaciones y /api/camiones
app.use("/api/productos", productosRouter);
app.use("/api/inventario", inventarioRouter);
app.use("/api/movimientos", movimientosRouter);
app.use("/api/apartados", apartadosRouter);
app.use("/api/despachos", despachosRouter);
app.use("/api/importaciones", requiereRol("ADMIN"), importacionRouter);
app.use("/api/usuarios", requiereRol("ADMIN"), usuariosRouter);

// Cualquier ruta que no exista → 404 en JSON (en vez del HTML por defecto de Express)
app.use((_req, res) => {
  res.status(404).json({ error: "Ruta no encontrada" });
});

// Siempre al final: recibe los errores de todas las rutas
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`StockFlow API corriendo en http://localhost:${PORT}`);
});
