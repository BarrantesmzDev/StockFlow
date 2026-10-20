import type { Prisma } from "../../generated/prisma/client.ts";
import { HttpError } from "../../lib/http-error.ts";

// Operaciones de stock que usan movimientos, apartados, empaque e importación.
// Siempre se llaman dentro de una transacción (tx) junto con el registro del movimiento:
// o se guardan las dos cosas, o ninguna.

type Tx = Prisma.TransactionClient;

export async function sumarStock(tx: Tx, productoId: number, ubicacionId: number, cantidad: number) {
  await tx.stock.upsert({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
    create: { productoId, ubicacionId, cantidad },
    update: { cantidad: { increment: cantidad } },
  });
}

// Resta en UNA sola sentencia: UPDATE ... SET cantidad = cantidad - x WHERE ... AND cantidad >= x.
// Si dos personas venden el último saco al mismo tiempo, PostgreSQL bloquea la fila y la
// segunda actualización ya no cumple "cantidad >= x": no hay forma de quedar en negativo.
// (Leer primero y restar después tendría una carrera entre la lectura y la escritura.)
export async function restarStock(tx: Tx, productoId: number, ubicacionId: number, cantidad: number) {
  const { count } = await tx.stock.updateMany({
    where: { productoId, ubicacionId, cantidad: { gte: cantidad } },
    data: { cantidad: { decrement: cantidad } },
  });
  if (count === 1) return;

  // En secuencia, no con Promise.all: una transacción usa UNA sola conexión
  const actual = await tx.stock.findUnique({ where: { productoId_ubicacionId: { productoId, ubicacionId } } });
  const producto = await tx.producto.findUnique({ where: { id: productoId }, select: { codigo: true } });
  const ubicacion = await tx.ubicacion.findUnique({ where: { id: ubicacionId }, select: { nombre: true } });
  throw new HttpError(
    409,
    `Stock insuficiente de ${producto?.codigo ?? `#${productoId}`} en ${ubicacion?.nombre ?? `#${ubicacionId}`}: ` +
      `hay ${Number(actual?.cantidad ?? 0)}, se necesitan ${cantidad}`,
  );
}

export async function leerStock(tx: Tx, productoId: number, ubicacionId: number): Promise<number> {
  const fila = await tx.stock.findUnique({
    where: { productoId_ubicacionId: { productoId, ubicacionId } },
  });
  return Number(fila?.cantidad ?? 0);
}

// La ubicación donde vive la mercadería apartada (tipo APARTADOS)
export async function ubicacionApartados(tx: Tx) {
  const ubicacion = await tx.ubicacion.findFirst({
    where: { tipo: "APARTADOS", activa: true },
    orderBy: { id: "asc" },
  });
  if (!ubicacion) throw new HttpError(500, "No hay una ubicación de tipo APARTADOS configurada");
  return ubicacion;
}

// La bodega principal (primera ubicación de tipo BODEGA). Contra ella se concilia SistemaCR.
export async function bodegaPrincipal(tx: Tx) {
  const ubicacion = await tx.ubicacion.findFirst({
    where: { tipo: "BODEGA", activa: true },
    orderBy: { id: "asc" },
  });
  if (!ubicacion) throw new HttpError(500, "No hay una ubicación de tipo BODEGA configurada");
  return ubicacion;
}
