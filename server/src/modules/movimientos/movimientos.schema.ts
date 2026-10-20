import { textoObligatorio, textoOpcional, traSchema } from "../../lib/documentos.ts";
import { z } from "../../lib/zod.ts";

const id = z.number().int().positive();
const cantidad = z.number().positive("La cantidad debe ser mayor a 0").max(9_999_999_999.99);

// Una línea = un producto. Serie y EP (código de garantía) se usan sobre todo en equipos.
const linea = z.strictObject({
  productoId: id,
  cantidad,
  serie: textoOpcional(100),
  codigoGarantia: textoOpcional(100),
});
const lineas = z.array(linea).min(1, "Agrega al menos un producto").max(500);

// Campos comunes a todos los tipos
const comunes = {
  fecha: z.coerce.date().optional(), // si no viene, ahora
  notas: textoOpcional(500),
};

// Un schema por tipo de movimiento: cada uno exige lo suyo.
// discriminatedUnion usa "tipo" para saber cuál aplicar (como un CASE en SQL).
export const registrarMovimientoSchema = z.discriminatedUnion("tipo", [
  // Compra o ingreso a una ubicación. documento: factura de compra (FC-xxxx), boleta, etc.
  z.strictObject({
    tipo: z.literal("ENTRADA"),
    destinoId: id,
    documento: textoOpcional(50),
    lineas,
    ...comunes,
  }),
  // Venta con factura
  z.strictObject({
    tipo: z.literal("VENTA"),
    origenId: id,
    factura: textoObligatorio(50, "La factura es obligatoria"),
    cliente: textoOpcional(150),
    lineas,
    ...comunes,
  }),
  // Devolución con nota de crédito: el material regresa al inventario
  z.strictObject({
    tipo: z.literal("DEVOLUCION"),
    destinoId: id,
    notaCredito: textoObligatorio(50, "La nota de crédito es obligatoria"),
    factura: textoOpcional(50),
    cliente: textoOpcional(150),
    lineas,
    ...comunes,
  }),
  // Movimiento INTERNO de mercadería entre ubicaciones propias, siempre con su TRA
  z.strictObject({
    tipo: z.literal("TRASLADO"),
    origenId: id,
    destinoId: id,
    documento: traSchema,
    lineas,
    ...comunes,
  }),
  // Conteo físico: se indica cuánto HAY, y el sistema registra la diferencia
  z.strictObject({
    tipo: z.literal("AJUSTE"),
    ubicacionId: id,
    documento: textoOpcional(50),
    lineas: z
      .array(z.strictObject({ productoId: id, cantidadContada: z.number().min(0).max(9_999_999_999.99) }))
      .min(1, "Agrega al menos un producto")
      .max(1000),
    fecha: comunes.fecha,
    notas: textoObligatorio(500, "Explica el motivo del ajuste"),
  }),
]);

const tipoMovimiento = z.enum(["ENTRADA", "VENTA", "DEVOLUCION", "TRASLADO", "AJUSTE"]);

export const listarMovimientosSchema = z.object({
  tipo: tipoMovimiento.optional(),
  productoId: z.coerce.number().int().positive().optional(),
  ubicacionId: z.coerce.number().int().positive().optional(),
  buscar: z.string().trim().max(100).optional(), // documento, factura, cliente, serie o EP
  desde: z.coerce.date().optional(),
  hasta: z.coerce.date().optional(),
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(200).default(50),
});

export type RegistrarMovimientoInput = z.infer<typeof registrarMovimientoSchema>;
export type ListarMovimientosFiltros = z.infer<typeof listarMovimientosSchema>;
