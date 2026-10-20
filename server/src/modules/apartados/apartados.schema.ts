import { textoObligatorio, textoOpcional } from "../../lib/documentos.ts";
import { z } from "../../lib/zod.ts";

const id = z.number().int().positive();

// Apartar: se puede apartar varios productos para el mismo cliente de una vez
export const crearApartadoSchema = z.strictObject({
  cliente: textoObligatorio(150, "El cliente es obligatorio"),
  telefono: textoOpcional(30),
  origenId: id, // de dónde sale la mercadería (y a dónde vuelve si se cancela)
  notas: textoOpcional(500),
  lineas: z
    .array(z.strictObject({ productoId: id, cantidad: z.number().positive().max(9_999_999_999.99) }))
    .min(1, "Agrega al menos un producto")
    .max(100),
});

// Entregar = venta desde Apartados, con factura
export const entregarApartadoSchema = z.strictObject({
  factura: textoObligatorio(50, "La factura es obligatoria"),
  serie: textoOpcional(100),
  codigoGarantia: textoOpcional(100),
});

export const cancelarApartadoSchema = z.strictObject({
  notas: textoOpcional(500),
});

export const listarApartadosSchema = z.object({
  estado: z.enum(["ACTIVO", "ENTREGADO", "CANCELADO"]).optional(),
  buscar: z.string().trim().max(100).optional(),
});

export type CrearApartadoInput = z.infer<typeof crearApartadoSchema>;
export type EntregarApartadoInput = z.infer<typeof entregarApartadoSchema>;
export type ListarApartadosFiltros = z.infer<typeof listarApartadosSchema>;
