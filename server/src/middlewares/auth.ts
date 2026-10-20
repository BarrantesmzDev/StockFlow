import type { Request, RequestHandler } from "express";
import type { Rol } from "../generated/prisma/client.ts";
import { HttpError } from "../lib/http-error.ts";
import { validarSesion, type UsuarioSesion } from "../modules/auth/auth.service.ts";

// Agrega req.usuario a los tipos de Express
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: UsuarioSesion;
    }
  }
}

// "Authorization: Bearer <token>" → token
export function leerToken(req: Request): string | null {
  const encabezado = req.headers.authorization;
  return encabezado?.startsWith("Bearer ") ? encabezado.slice(7).trim() || null : null;
}

// Exige una sesión válida y deja el usuario en req.usuario
export const autenticar: RequestHandler = async (req, _res, next) => {
  const token = leerToken(req);
  const usuario = token ? await validarSesion(token) : null;
  if (!usuario) throw new HttpError(401, "Inicia sesión para continuar");
  req.usuario = usuario;
  next();
};

// Solo deja pasar a los roles indicados
export function requiereRol(...roles: Rol[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.rol)) {
      throw new HttpError(403, "No tienes permiso para esta acción");
    }
    next();
  };
}

// El rol CONSULTA puede ver todo pero no modificar nada
export const consultaSoloLectura: RequestHandler = (req, _res, next) => {
  if (req.usuario?.rol === "CONSULTA" && req.method !== "GET") {
    throw new HttpError(403, "Tu usuario es de solo consulta");
  }
  next();
};

// El usuario autenticado (para los handlers que corren después de autenticar)
export function usuarioActual(req: Request): UsuarioSesion {
  if (!req.usuario) throw new HttpError(401, "Inicia sesión para continuar");
  return req.usuario;
}
