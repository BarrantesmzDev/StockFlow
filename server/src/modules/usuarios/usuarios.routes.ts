import { Router } from "express";
import { idParamSchema } from "../productos/productos.schema.ts";
import { actualizarUsuarioSchema, crearUsuarioSchema } from "./usuarios.schema.ts";
import * as usuariosService from "./usuarios.service.ts";

// Solo ADMIN (el permiso se aplica al montar el router en index.ts)
export const usuariosRouter = Router();

usuariosRouter.get("/", async (_req, res) => {
  res.json(await usuariosService.listarUsuarios());
});

usuariosRouter.post("/", async (req, res) => {
  const datos = crearUsuarioSchema.parse(req.body);
  res.status(201).json(await usuariosService.crearUsuario(datos));
});

usuariosRouter.patch("/:id", async (req, res) => {
  const { id } = idParamSchema.parse(req.params);
  const datos = actualizarUsuarioSchema.parse(req.body);
  res.json(await usuariosService.actualizarUsuario(id, datos));
});
