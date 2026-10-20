import { Router } from "express";
import { prisma } from "../../lib/prisma.ts";

// Listas para los selectores del frontend
export const catalogosRouter = Router();

// GET /api/ubicaciones
catalogosRouter.get("/ubicaciones", async (_req, res) => {
  res.json(await prisma.ubicacion.findMany({ where: { activa: true }, orderBy: { id: "asc" } }));
});

// GET /api/camiones
catalogosRouter.get("/camiones", async (_req, res) => {
  res.json(await prisma.camion.findMany({ where: { activo: true }, orderBy: { id: "asc" } }));
});
