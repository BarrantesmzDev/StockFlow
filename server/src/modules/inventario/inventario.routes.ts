import { Router } from "express";
import { requiereRol } from "../../middlewares/auth.ts";
import { importarSistemaCrSchema, verInventarioSchema } from "./inventario.schema.ts";
import * as inventarioService from "./inventario.service.ts";

export const inventarioRouter = Router();

// GET /api/inventario?buscar=cloro&soloDiferencias=true
inventarioRouter.get("/", async (req, res) => {
  res.json(await inventarioService.verInventario(verInventarioSchema.parse(req.query)));
});

// POST /api/inventario/sistema-cr { filaInicio, filas, columnas } (solo ADMIN)
inventarioRouter.post("/sistema-cr", requiereRol("ADMIN"), async (req, res) => {
  const datos = importarSistemaCrSchema.parse(req.body);
  res.json(await inventarioService.importarSistemaCr(datos));
});
