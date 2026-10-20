import type { Prisma } from "../../generated/prisma/client.ts";
import { normalizarTra } from "../../lib/documentos.ts";
import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { leerStock, restarStock, sumarStock } from "../inventario/stock.ts";
import type { ListarMovimientosFiltros, RegistrarMovimientoInput } from "./movimientos.schema.ts";

type Tx = Prisma.TransactionClient;

// Registra un movimiento con todas sus líneas en UNA transacción:
// si una línea no tiene stock suficiente, no se guarda ninguna (como BEGIN TRAN ... ROLLBACK).
export async function registrarMovimiento(entrada: RegistrarMovimientoInput, usuarioId: number) {
  return prisma.$transaction(
    async (tx) => {
      await validarReferencias(tx, entrada);
      const fecha = entrada.fecha ?? new Date();
      const filas: Prisma.MovimientoCreateManyInput[] = [];

      if (entrada.tipo === "AJUSTE") {
        for (const { productoId, cantidadContada } of entrada.lineas) {
          const actual = await leerStock(tx, productoId, entrada.ubicacionId);
          const diferencia = Math.round((cantidadContada - actual) * 100) / 100;
          if (diferencia === 0) continue; // el conteo coincide: nada que ajustar
          if (diferencia > 0) await sumarStock(tx, productoId, entrada.ubicacionId, diferencia);
          else await restarStock(tx, productoId, entrada.ubicacionId, -diferencia);
          filas.push({
            tipo: "AJUSTE",
            productoId,
            cantidad: Math.abs(diferencia),
            // Sobra → entra (destino). Falta → sale (origen).
            destinoId: diferencia > 0 ? entrada.ubicacionId : null,
            origenId: diferencia < 0 ? entrada.ubicacionId : null,
            documento: entrada.documento,
            notas: `${entrada.notas} (sistema: ${actual}, contado: ${cantidadContada})`,
            fecha,
            usuarioId,
          });
        }
      } else {
        for (const linea of entrada.lineas) {
          const base = {
            tipo: entrada.tipo,
            productoId: linea.productoId,
            cantidad: linea.cantidad,
            serie: linea.serie,
            codigoGarantia: linea.codigoGarantia,
            notas: entrada.notas,
            fecha,
            usuarioId,
          };
          switch (entrada.tipo) {
            case "ENTRADA":
              await sumarStock(tx, linea.productoId, entrada.destinoId, linea.cantidad);
              filas.push({ ...base, destinoId: entrada.destinoId, documento: entrada.documento });
              break;
            case "VENTA":
              await restarStock(tx, linea.productoId, entrada.origenId, linea.cantidad);
              filas.push({ ...base, origenId: entrada.origenId, factura: entrada.factura, cliente: entrada.cliente });
              break;
            case "DEVOLUCION":
              await sumarStock(tx, linea.productoId, entrada.destinoId, linea.cantidad);
              filas.push({
                ...base,
                destinoId: entrada.destinoId,
                notaCredito: entrada.notaCredito,
                factura: entrada.factura,
                cliente: entrada.cliente,
              });
              break;
            case "TRASLADO":
              await restarStock(tx, linea.productoId, entrada.origenId, linea.cantidad);
              await sumarStock(tx, linea.productoId, entrada.destinoId, linea.cantidad);
              filas.push({
                ...base,
                origenId: entrada.origenId,
                destinoId: entrada.destinoId,
                documento: entrada.documento,
              });
              break;
          }
        }
      }

      const creados = await tx.movimiento.createManyAndReturn({ data: filas, select: { id: true } });
      return { registrados: creados.length, ids: creados.map((m) => m.id) };
    },
    { timeout: 30_000 },
  );
}

// Productos activos, ubicaciones activas y reglas que Zod no puede ver (necesitan la base)
async function validarReferencias(tx: Tx, entrada: RegistrarMovimientoInput) {
  const ids = [...new Set(entrada.lineas.map((l) => l.productoId))];
  const productos = await tx.producto.findMany({ where: { id: { in: ids } }, select: { id: true, codigo: true, activo: true } });
  for (const productoId of ids) {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto) throw new HttpError(400, `No existe el producto con id ${productoId}`);
    if (!producto.activo) throw new HttpError(400, `El producto ${producto.codigo} está inactivo`);
  }

  const ubicacionIds = [
    "origenId" in entrada ? entrada.origenId : undefined,
    "destinoId" in entrada ? entrada.destinoId : undefined,
    "ubicacionId" in entrada ? entrada.ubicacionId : undefined,
  ].filter((v): v is number => v !== undefined);
  const ubicaciones = await tx.ubicacion.findMany({ where: { id: { in: ubicacionIds } } });
  for (const ubicacionId of ubicacionIds) {
    const ubicacion = ubicaciones.find((u) => u.id === ubicacionId);
    if (!ubicacion || !ubicacion.activa) throw new HttpError(400, `La ubicación #${ubicacionId} no existe o está inactiva`);
    // La ubicación de apartados solo se toca desde la sección Apartados, para que su stock
    // siempre sea igual a la suma de los apartados activos
    if (ubicacion.tipo === "APARTADOS") {
      throw new HttpError(400, `Lo que está en ${ubicacion.nombre} se maneja desde la sección Apartados`);
    }
  }

  if (entrada.tipo === "TRASLADO" && entrada.origenId === entrada.destinoId) {
    throw new HttpError(400, "El origen y el destino del traslado deben ser distintos");
  }
}

export async function listarMovimientos(filtros: ListarMovimientosFiltros) {
  const { tipo, productoId, ubicacionId, buscar, desde, hasta, pagina, tamano } = filtros;

  const where: Prisma.MovimientoWhereInput = {
    tipo,
    productoId,
    ...(ubicacionId ? { OR: [{ origenId: ubicacionId }, { destinoId: ubicacionId }] } : {}),
    ...(desde || hasta ? { fecha: { gte: desde, lte: hasta } } : {}),
    ...(buscar
      ? {
          AND: {
            OR: [
              { documento: { contains: normalizarTra(buscar), mode: "insensitive" } },
              { documento: { contains: buscar, mode: "insensitive" } },
              { factura: { contains: buscar, mode: "insensitive" } },
              { notaCredito: { contains: buscar, mode: "insensitive" } },
              { cliente: { contains: buscar, mode: "insensitive" } },
              { serie: { contains: buscar, mode: "insensitive" } },
              { codigoGarantia: { contains: buscar, mode: "insensitive" } },
              { producto: { codigo: { contains: buscar, mode: "insensitive" } } },
            ],
          },
        }
      : {}),
  };

  // Las dos consultas en paralelo: la página de resultados y el total (para el paginador)
  const [items, total] = await Promise.all([
    prisma.movimiento.findMany({
      where,
      orderBy: [{ fecha: "desc" }, { id: "desc" }],
      skip: (pagina - 1) * tamano,
      take: tamano,
      include: {
        producto: { select: { codigo: true, nombre: true, unidad: true } },
        origen: { select: { nombre: true } },
        destino: { select: { nombre: true } },
        usuario: { select: { nombre: true } },
      },
    }),
    prisma.movimiento.count({ where }),
  ]);
  return { items, total, pagina, tamano };
}
