import { textoOpcional, traSchema } from "../../lib/documentos.ts";
import { z } from "../../lib/zod.ts";

const id = z.number().int().positive();

// Un despacho es la preparación física de un TRA: se crea con sus artículos y luego se empaca
export const crearDespachoSchema = z.strictObject({
  documento: traSchema,
  origenId: id,
  destinoId: id,
  camionId: id.optional(),
  notas: textoOpcional(500),
  lineas: z
    .array(z.strictObject({ productoId: id, cantidad: z.number().positive().max(9_999_999_999.99) }))
    .min(1, "Agrega al menos un producto")
    .max(500),
});

// Cuánto de esa línea ya está empacado (valor absoluto, de 0 a la cantidad de la línea)
export const empacarLineaSchema = z.strictObject({
  cantidadEmpacada: z.number().min(0).max(9_999_999_999.99),
});

export const actualizarDespachoSchema = z
  .strictObject({
    camionId: id.nullable().optional(),
    notas: textoOpcional(500),
  })
  .refine((datos) => Object.keys(datos).length > 0, "Envía al menos un campo para actualizar");

export const documentoParamSchema = z.object({ documento: traSchema });

export const listarDespachosSchema = z.object({
  estado: z.enum(["ABIERTO", "EMPACADO", "DESPACHADO", "CANCELADO"]).optional(),
});

export type CrearDespachoInput = z.infer<typeof crearDespachoSchema>;
export type ActualizarDespachoInput = z.infer<typeof actualizarDespachoSchema>;
