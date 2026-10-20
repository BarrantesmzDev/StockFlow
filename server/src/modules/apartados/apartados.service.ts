import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { restarStock, sumarStock, ubicacionApartados } from "../inventario/stock.ts";
import type {
  CrearApartadoInput,
  EntregarApartadoInput,
  ListarApartadosFiltros,
} from "./apartados.schema.ts";

// Reglas del negocio:
//  apartar  = traslado de la ubicación de origen → Apartados
//  entregar = venta desde Apartados (con factura)
//  cancelar = traslado de vuelta Apartados → ubicación de origen

const incluir = {
  producto: { select: { codigo: true, nombre: true, unidad: true } },
  origen: { select: { nombre: true } },
  usuario: { select: { nombre: true } },
} as const;

export async function listarApartados({ estado, buscar }: ListarApartadosFiltros) {
  return prisma.apartado.findMany({
    where: {
      estado,
      ...(buscar
        ? {
            OR: [
              { cliente: { contains: buscar, mode: "insensitive" } },
              { telefono: { contains: buscar } },
              { factura: { contains: buscar, mode: "insensitive" } },
              { producto: { codigo: { contains: buscar, mode: "insensitive" } } },
              { producto: { nombre: { contains: buscar, mode: "insensitive" } } },
            ],
          }
        : {}),
    },
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
    take: 500,
    include: incluir,
  });
}

export async function crearApartado(entrada: CrearApartadoInput, usuarioId: number) {
  return prisma.$transaction(
    async (tx) => {
      const apartados = await ubicacionApartados(tx);
      if (entrada.origenId === apartados.id) {
        throw new HttpError(400, "El origen no puede ser la ubicación de apartados");
      }
      const creados = [];
      for (const { productoId, cantidad } of entrada.lineas) {
        const producto = await tx.producto.findUnique({ where: { id: productoId } });
        if (!producto?.activo) throw new HttpError(400, `El producto #${productoId} no existe o está inactivo`);

        await restarStock(tx, productoId, entrada.origenId, cantidad);
        await sumarStock(tx, productoId, apartados.id, cantidad);
        const apartado = await tx.apartado.create({
          data: {
            cliente: entrada.cliente,
            telefono: entrada.telefono,
            notas: entrada.notas,
            origenId: entrada.origenId,
            productoId,
            cantidad,
            usuarioId,
          },
          include: incluir,
        });
        await tx.movimiento.create({
          data: {
            tipo: "TRASLADO",
            productoId,
            cantidad,
            origenId: entrada.origenId,
            destinoId: apartados.id,
            cliente: entrada.cliente,
            notas: `Apartado #${apartado.id}`,
            apartadoId: apartado.id,
            usuarioId,
          },
        });
        creados.push(apartado);
      }
      return creados;
    },
    { timeout: 30_000 },
  );
}

export async function entregarApartado(id: number, entrada: EntregarApartadoInput, usuarioId: number) {
  return prisma.$transaction(async (tx) => {
    // Pasa de ACTIVO a ENTREGADO en una sola sentencia: si dos personas entregan el mismo
    // apartado a la vez, solo una lo logra (la otra ve count = 0)
    const { count } = await tx.apartado.updateMany({
      where: { id, estado: "ACTIVO" },
      data: { estado: "ENTREGADO", factura: entrada.factura, cerradoEn: new Date() },
    });
    if (count === 0) throw await errorNoActivo(id);

    const apartado = await tx.apartado.findUniqueOrThrow({ where: { id } });
    const apartados = await ubicacionApartados(tx);
    const cantidad = Number(apartado.cantidad);
    await restarStock(tx, apartado.productoId, apartados.id, cantidad);
    await tx.movimiento.create({
      data: {
        tipo: "VENTA",
        productoId: apartado.productoId,
        cantidad,
        origenId: apartados.id,
        factura: entrada.factura,
        cliente: apartado.cliente,
        serie: entrada.serie,
        codigoGarantia: entrada.codigoGarantia,
        notas: `Entrega de apartado #${id}`,
        apartadoId: id,
        usuarioId,
      },
    });
    return tx.apartado.findUniqueOrThrow({ where: { id }, include: incluir });
  });
}

export async function cancelarApartado(id: number, notas: string | undefined, usuarioId: number) {
  return prisma.$transaction(async (tx) => {
    const { count } = await tx.apartado.updateMany({
      where: { id, estado: "ACTIVO" },
      data: { estado: "CANCELADO", cerradoEn: new Date() },
    });
    if (count === 0) throw await errorNoActivo(id);

    const apartado = await tx.apartado.findUniqueOrThrow({ where: { id } });
    const apartados = await ubicacionApartados(tx);
    const cantidad = Number(apartado.cantidad);
    await restarStock(tx, apartado.productoId, apartados.id, cantidad);
    await sumarStock(tx, apartado.productoId, apartado.origenId, cantidad);
    await tx.movimiento.create({
      data: {
        tipo: "TRASLADO",
        productoId: apartado.productoId,
        cantidad,
        origenId: apartados.id,
        destinoId: apartado.origenId,
        cliente: apartado.cliente,
        notas: `Cancelación de apartado #${id}${notas ? `: ${notas}` : ""}`,
        apartadoId: id,
        usuarioId,
      },
    });
    return tx.apartado.findUniqueOrThrow({ where: { id }, include: incluir });
  });
}

async function errorNoActivo(id: number) {
  const apartado = await prisma.apartado.findUnique({ where: { id }, select: { estado: true } });
  return apartado
    ? new HttpError(409, `El apartado #${id} ya está ${apartado.estado.toLowerCase()}`)
    : new HttpError(404, `No existe el apartado #${id}`);
}
