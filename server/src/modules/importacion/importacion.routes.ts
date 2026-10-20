import express, { Router } from "express";
import { HttpError } from "../../lib/http-error.ts";
import { z } from "../../lib/zod.ts";
import { usuarioActual } from "../../middlewares/auth.ts";
import { importarProductosSchema } from "./importacion.schema.ts";
import * as importacionService from "./importacion.service.ts";

// Solo ADMIN (el permiso se aplica al montar el router en index.ts)
export const importacionRouter = Router();

// POST /api/importaciones/leer — el cuerpo ES el archivo (Content-Type: application/octet-stream).
// Devuelve las hojas como tablas para que el usuario elija hoja y columnas en el navegador.
importacionRouter.post(
  "/leer",
  express.raw({ type: "application/octet-stream", limit: "15mb" }),
  async (req, res) => {
    if (!Buffer.isBuffer(req.body) || req.body.length === 0) {
      throw new HttpError(400, "Envía el archivo .xlsx o .csv");
    }
    res.json({ hojas: await importacionService.leerHojas(req.body) });
  },
);

// POST /api/importaciones/productos/previsualizar → qué pasaría con cada fila (no guarda nada)
importacionRouter.post("/productos/previsualizar", async (req, res) => {
  const datos = importarProductosSchema.parse(req.body);
  res.json(await importacionService.previsualizarProductos(datos));
});

// POST /api/importaciones/productos/confirmar → importa catálogo y saldo inicial
const confirmarSchema = importarProductosSchema.extend({ fechaCorte: z.coerce.date().optional() });
importacionRouter.post("/productos/confirmar", async (req, res) => {
  const datos = confirmarSchema.parse(req.body);
  res.json(await importacionService.confirmarProductos(datos, usuarioActual(req).id));
});
