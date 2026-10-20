import { z } from "../../lib/zod.ts";
import { MAX_COLUMNAS, MAX_FILAS } from "../importacion/importacion.lector.ts";

const booleano = z
  .enum(["true", "false"])
  .optional()
  .transform((valor) => valor === "true");

export const verInventarioSchema = z.object({
  buscar: z.string().trim().max(100).optional(),
  soloDiferencias: booleano, // solo productos donde el stock no coincide con SistemaCR
  soloConStock: booleano,
  incluirInactivos: booleano,
});

const celda = z.union([z.string(), z.number(), z.boolean(), z.null()]);
const columna = z.number().int().min(0).max(MAX_COLUMNAS - 1);

// Exportación de SistemaCR: código y cantidad (el nombre es opcional, solo informativo)
export const importarSistemaCrSchema = z.strictObject({
  filaInicio: z.number().int().positive(),
  filas: z.array(z.array(celda)).max(MAX_FILAS),
  columnas: z.strictObject({ codigo: columna, cantidad: columna, nombre: columna.optional() }),
});

export type VerInventarioFiltros = z.infer<typeof verInventarioSchema>;
export type ImportarSistemaCrInput = z.infer<typeof importarSistemaCrSchema>;
