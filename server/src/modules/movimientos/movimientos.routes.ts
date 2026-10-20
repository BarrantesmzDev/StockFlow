import { Router } from "express";
import { usuarioActual } from "../../middlewares/auth.ts";
import { listarMovimientosSchema, registrarMovimientoSchema } from "./movimientos.schema.ts";
import * as movimientosService from "./movimientos.service.ts";

export const movimientosRouter = Router();

// GET /api/movimientos?tipo=VENTA&buscar=21028&pagina=1
movimientosRouter.get("/", async (req, res) => {
  const filtros = listarMovimientosSchema.parse(req.query);
  res.json(await movimientosService.listarMovimientos(filtros));
});

// POST /api/movimientos { tipo, ..., lineas: [...] }
movimientosRouter.post("/", async (req, res) => {
  const datos = registrarMovimientoSchema.parse(req.body);
  res.status(201).json(await movimientosService.registrarMovimiento(datos, usuarioActual(req).id));
});
