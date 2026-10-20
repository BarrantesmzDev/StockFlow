import { Router } from "express";
import { usuarioActual } from "../../middlewares/auth.ts";
import { z } from "../../lib/zod.ts";
import { idParamSchema } from "../productos/productos.schema.ts";
import {
  actualizarDespachoSchema,
  crearDespachoSchema,
  documentoParamSchema,
  empacarLineaSchema,
  listarDespachosSchema,
} from "./despachos.schema.ts";
import * as despachosService from "./despachos.service.ts";

export const despachosRouter = Router();

const lineaParamSchema = z.object({
  id: z.coerce.number().int().positive(),
  lineaId: z.coerce.number().int().positive(),
});

// GET /api/despachos?estado=ABIERTO
despachosRouter.get("/", async (req, res) => {
  const { estado } = listarDespachosSchema.parse(req.query);
  res.json(await despachosService.listarDespachos(estado));
});

// GET /api/despachos/documento/TRA-2394 (también acepta "2394" o "tra2394")
despachosRouter.get("/documento/:documento", async (req, res) => {
  const { documento } = documentoParamSchema.parse(req.params);
  res.json(await despachosService.conDisponible(await despachosService.obtenerPorDocumento(documento)));
});

// POST /api/despachos { documento, origenId, destinoId, camionId?, lineas }
despachosRouter.post("/", async (req, res) => {
  const datos = crearDespachoSchema.parse(req.body);
  res.status(201).json(await despachosService.conDisponible(await despachosService.crearDespacho(datos, usuarioActual(req).id)));
});

// PATCH /api/despachos/3 { camionId?, notas? }
despachosRouter.patch("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await despachosService.conDisponible(await despachosService.actualizarDespacho(id, actualizarDespachoSchema.parse(req.body))));
});

// PUT /api/despachos/3/lineas/7 { cantidadEmpacada }
despachosRouter.put("/:id/lineas/:lineaId", async (req, res) => {
  const { id, lineaId } = lineaParamSchema.parse(req.params);
  const { cantidadEmpacada } = empacarLineaSchema.parse(req.body);
  res.json(await despachosService.conDisponible(await despachosService.empacarLinea(id, lineaId, cantidadEmpacada)));
});

// POST /api/despachos/3/despachar → mueve el stock
despachosRouter.post("/:id/despachar", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await despachosService.conDisponible(await despachosService.despachar(id, usuarioActual(req).id)));
});

// POST /api/despachos/3/cancelar
despachosRouter.post("/:id/cancelar", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await despachosService.conDisponible(await despachosService.cancelarDespacho(id)));
});
