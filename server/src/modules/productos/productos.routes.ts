import { Router } from "express";
import * as productosService from "./productos.service.ts";
import {
  actualizarProductoSchema,
  crearProductoSchema,
  idParamSchema,
  listarProductosSchema,
} from "./productos.schema.ts";

// Cada ruta: 1) validar con Zod  2) llamar al service  3) responder.
// Si algo falla, el error sube solo al error handler (Express 5 atrapa los async).
export const productosRouter = Router();

// GET /api/productos?buscar=cloro&incluirInactivos=true
productosRouter.get("/", async (req, res) => {
  const filtros = listarProductosSchema.parse(req.query);
  res.json(await productosService.listarProductos(filtros));
});

// GET /api/productos/5
productosRouter.get("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await productosService.obtenerProducto(id));
});

// POST /api/productos  { "codigo": "...", "nombre": "...", "unidad"?, "pesoKg"? }
productosRouter.post("/", async (req, res) => {
  const datos = crearProductoSchema.parse(req.body);
  res.status(201).json(await productosService.crearProducto(datos));
});

// PATCH /api/productos/5  { solo los campos que cambian }
productosRouter.patch("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const datos = actualizarProductoSchema.parse(req.body);
  res.json(await productosService.actualizarProducto(id, datos));
});

// DELETE /api/productos/5  → soft delete (activo = false)
productosRouter.delete("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  res.json(await productosService.desactivarProducto(id));
});
