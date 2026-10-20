import { Router } from "express";
import { usuarioActual } from "../../middlewares/auth.ts";
import { idParamSchema } from "../productos/productos.schema.ts";
import {
  cancelarApartadoSchema,
  crearApartadoSchema,
  entregarApartadoSchema,
  listarApartadosSchema,
} from "./apartados.schema.ts";
import * as apartadosService from "./apartados.service.ts";

export const apartadosRouter = Router();

// GET /api/apartados?estado=ACTIVO&buscar=juan
apartadosRouter.get("/", async (req, res) => {
  res.json(await apartadosService.listarApartados(listarApartadosSchema.parse(req.query)));
});

// POST /api/apartados { cliente, origenId, lineas: [{ productoId, cantidad }] }
apartadosRouter.post("/", async (req, res) => {
  const datos = crearApartadoSchema.parse(req.body);
  res.status(201).json(await apartadosService.crearApartado(datos, usuarioActual(req).id));
});

// POST /api/apartados/5/entregar { factura }
apartadosRouter.post("/:id/entregar", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const datos = entregarApartadoSchema.parse(req.body);
  res.json(await apartadosService.entregarApartado(id, datos, usuarioActual(req).id));
});

// POST /api/apartados/5/cancelar { notas? }
apartadosRouter.post("/:id/cancelar", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const { notas } = cancelarApartadoSchema.parse(req.body ?? {});
  res.json(await apartadosService.cancelarApartado(id, notas, usuarioActual(req).id));
});
