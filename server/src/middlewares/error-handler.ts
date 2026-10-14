import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../lib/http-error.ts";

// Middleware de errores: Express 5 manda aquí cualquier error lanzado en una ruta
// (también los de funciones async). Se registra al final, después de todas las rutas.
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  // Errores que lanzamos nosotros a propósito (404, 409...)
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Datos que no pasaron la validación de Zod → 400 con el detalle por campo
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Datos inválidos",
      detalles: err.issues.map((issue) => ({
        // Campos que sobran (strictObject) no tienen path: se toma el nombre de issue.keys
        campo:
          issue.code === "unrecognized_keys"
            ? issue.keys.join(", ")
            : issue.path.map(String).join("."),
        mensaje: issue.message,
      })),
    });
    return;
  }

  // Body con JSON mal escrito (lo detecta express.json())
  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ error: "JSON mal formado" });
    return;
  }

  // Otros errores del cliente que trae Express con su status (ej. 413 body muy grande)
  if (typeof err?.status === "number" && err.status >= 400 && err.status < 500) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  // Cualquier otra cosa es un error nuestro: se registra en consola y al cliente
  // no se le dan detalles internos.
  console.error(err);
  res.status(500).json({ error: "Error interno del servidor" });
};
