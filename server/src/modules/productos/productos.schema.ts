import { z } from "../../lib/zod.ts";

// Reglas de cada campo, reutilizadas en crear y actualizar
const codigo = z.string().trim().min(1, "El código es obligatorio").max(50);
const nombre = z.string().trim().min(1, "El nombre es obligatorio").max(200);
const unidad = z.string().trim().min(1).max(20).toUpperCase();
// Decimal(10,3) en la BD → máximo 9,999,999.999. null = sin peso registrado.
const pesoKg = z.number().positive("El peso debe ser mayor a 0").max(9_999_999.999).nullable();

// strictObject: rechaza campos desconocidos (ej. "peso_kg" en vez de "pesoKg")
export const crearProductoSchema = z.strictObject({
  codigo,
  nombre,
  unidad: unidad.default("UND"),
  pesoKg: pesoKg.optional(),
});

// Todo opcional y SIN .default(): si no mandan "unidad", no se toca.
export const actualizarProductoSchema = z
  .strictObject({
    codigo: codigo.optional(),
    nombre: nombre.optional(),
    unidad: unidad.optional(),
    pesoKg: pesoKg.optional(),
    activo: z.boolean().optional(),
  })
  .refine((datos) => Object.keys(datos).length > 0, "Envía al menos un campo para actualizar");

// Query string: todo llega como texto (?incluirInactivos=true)
export const listarProductosSchema = z.object({
  buscar: z.string().trim().optional(),
  incluirInactivos: z
    .enum(["true", "false"])
    .optional()
    .transform((valor) => valor === "true"),
});

// /api/productos/:id → el id llega como texto, se convierte a número
export const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export type CrearProductoInput = z.infer<typeof crearProductoSchema>;
export type ActualizarProductoInput = z.infer<typeof actualizarProductoSchema>;
export type ListarProductosFiltros = z.infer<typeof listarProductosSchema>;
