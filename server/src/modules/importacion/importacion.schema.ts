import { z } from "../../lib/zod.ts";
import { MAX_COLUMNAS, MAX_FILAS } from "./importacion.lector.ts";

const celda = z.union([z.string(), z.number(), z.boolean(), z.null()]);
// Índice de columna empezando en 0 (A = 0, B = 1, ...)
const columna = z.number().int().min(0).max(MAX_COLUMNAS - 1);

// Lo que manda el frontend después de que el usuario elige hoja y asigna columnas
export const importarProductosSchema = z.strictObject({
  // Número de fila de Excel donde empiezan los datos (la de abajo de los encabezados)
  filaInicio: z.number().int().positive(),
  filas: z.array(z.array(celda)).max(MAX_FILAS),
  columnas: z.strictObject({
    codigo: columna,
    nombre: columna,
    unidad: columna.optional(),
    pesoKg: columna.optional(),
  }),
  // Saldo inicial: qué columna trae el stock de cada ubicación (las no asignadas quedan en 0)
  stock: z
    .array(z.strictObject({ ubicacionId: z.number().int().positive(), columna }))
    .max(20)
    .refine(
      (lista) => new Set(lista.map((s) => s.ubicacionId)).size === lista.length,
      "Cada ubicación se puede asignar a una sola columna",
    ),
  sugerirPesos: z.boolean().default(true),
  sugerirUnidades: z.boolean().default(true),
  // Productos que YA existen: por defecto solo se actualiza el catálogo y su stock no se toca.
  // Reemplazarlo borraría lo registrado desde la importación anterior.
  reemplazarStock: z.boolean().default(false),
});

export type ImportarProductosInput = z.infer<typeof importarProductosSchema>;
