import { Router } from "express";
import { autenticar, leerToken, usuarioActual } from "../../middlewares/auth.ts";
import { configurarSchema, loginSchema } from "./auth.schema.ts";
import * as authService from "./auth.service.ts";

export const authRouter = Router();

// GET /api/auth/estado → ¿hay que crear el primer administrador?
authRouter.get("/estado", async (_req, res) => {
  res.json({ necesitaConfiguracion: await authService.necesitaConfiguracion() });
});

// POST /api/auth/configurar { nombre, email, password } → solo funciona si no hay usuarios
authRouter.post("/configurar", async (req, res) => {
  const datos = configurarSchema.parse(req.body);
  res.status(201).json(await authService.configurarInicial(datos));
});

// POST /api/auth/login { email, password } → { token, usuario }
authRouter.post("/login", async (req, res) => {
  const datos = loginSchema.parse(req.body);
  res.json(await authService.iniciarSesion(datos));
});

// POST /api/auth/logout → borra la sesión del servidor
authRouter.post("/logout", async (req, res) => {
  const token = leerToken(req);
  if (token) await authService.cerrarSesion(token);
  res.status(204).end();
});

// GET /api/auth/yo → el usuario de la sesión actual
authRouter.get("/yo", autenticar, (req, res) => {
  res.json(usuarioActual(req));
});
