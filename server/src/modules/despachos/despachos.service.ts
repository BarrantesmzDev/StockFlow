import { Prisma } from "../../generated/prisma/client.ts";
import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { restarStock, sumarStock } from "../inventario/stock.ts";
import type { ActualizarDespachoInput, CrearDespachoInput } from "./despachos.schema.ts";

// Empaque por TRA:
//  1. Se crea el despacho con los artículos del TRA (todos "pendientes").
//  2. Al empacar, cada artículo pasa a "empacado" y su peso se suma contra la capacidad del camión.
//  3. Con todo empacado se despacha: recién ahí se mueve el stock (TRASLADO origen → destino).

type Tx = Prisma.TransactionClient;

const incluir = {
  origen: { select: { id: true, nombre: true } },
  destino: { select: { id: true, nombre: true } },
  camion: true,
  usuario: { select: { nombre: true } },
  lineas: {
    include: { producto: { select: { codigo: true, nombre: true, unidad: true } } },
    orderBy: { id: "asc" },
  },
} satisfies Prisma.DespachoInclude;

type DespachoCompleto = Prisma.DespachoGetPayload<{ include: typeof incluir }>;

// Agrega los totales que necesita la pantalla de empaque
function conResumen(despacho: DespachoCompleto) {
  let pesoTotalKg = 0;
  let pesoEmpacadoKg = 0;
  let lineasSinPeso = 0;
  for (const linea of despacho.lineas) {
    const peso = Number(linea.pesoUnitarioKg);
    pesoTotalKg += Number(linea.cantidad) * peso;
    pesoEmpacadoKg += Number(linea.cantidadEmpacada) * peso;
    if (peso === 0) lineasSinPeso++;
  }
  return {
    ...despacho,
    resumen: {
      pesoTotalKg: Math.round(pesoTotalKg * 100) / 100,
      pesoEmpacadoKg: Math.round(pesoEmpacadoKg * 100) / 100,
      capacidadKg: despacho.camion ? Number(despacho.camion.capacidadKg) : null,
      lineasSinPeso,
    },
  };
}

// Agrega a cada línea cuánto hay HOY en la ubicación de origen, para avisar antes de empacar
// que no alcanza el stock (el despacho igual se valida al despachar, dentro de la transacción)
export async function conDisponible<T extends { origenId: number; lineas: { productoId: number }[] }>(despacho: T) {
  const stock = await prisma.stock.findMany({
    where: { ubicacionId: despacho.origenId, productoId: { in: despacho.lineas.map((l) => l.productoId) } },
  });
  return {
    ...despacho,
    lineas: despacho.lineas.map((linea) => ({
      ...linea,
      disponibleOrigen: Number(stock.find((s) => s.productoId === linea.productoId)?.cantidad ?? 0),
    })),
  };
}

// SELECT ... FOR UPDATE: bloquea el despacho hasta que termine la transacción. Si dos personas
// empacan a la vez, la segunda espera y calcula el peso con los datos ya actualizados.
async function bloquearDespacho(tx: Tx, id: number): Promise<DespachoCompleto> {
  await tx.$queryRaw`SELECT id FROM despachos WHERE id = ${id} FOR UPDATE`;
  const despacho = await tx.despacho.findUnique({ where: { id }, include: incluir });
  if (!despacho) throw new HttpError(404, `No existe el despacho #${id}`);
  return despacho;
}

function exigirEditable(despacho: DespachoCompleto) {
  if (despacho.estado === "DESPACHADO" || despacho.estado === "CANCELADO") {
    throw new HttpError(409, `El ${despacho.documento} ya está ${despacho.estado.toLowerCase()}`);
  }
}

export async function listarDespachos(estado?: DespachoCompleto["estado"]) {
  const despachos = await prisma.despacho.findMany({
    where: { estado },
    orderBy: [{ creadoEn: "desc" }, { id: "desc" }],
    take: 100,
    include: incluir,
  });
  return despachos.map(conResumen);
}

export async function obtenerPorDocumento(documento: string) {
  const despacho = await prisma.despacho.findUnique({ where: { documento }, include: incluir });
  if (!despacho) throw new HttpError(404, `No hay despacho para ${documento}`);
  return conResumen(despacho);
}

export async function crearDespacho(entrada: CrearDespachoInput, usuarioId: number) {
  if (entrada.origenId === entrada.destinoId) {
    throw new HttpError(400, "El origen y el destino deben ser distintos");
  }
  const ids = entrada.lineas.map((l) => l.productoId);
  if (new Set(ids).size !== ids.length) {
    throw new HttpError(400, "Hay productos repetidos: suma las cantidades en una sola línea");
  }

  const [productos, ubicaciones, camion] = await Promise.all([
    prisma.producto.findMany({ where: { id: { in: ids } } }),
    prisma.ubicacion.findMany({ where: { id: { in: [entrada.origenId, entrada.destinoId] } } }),
    entrada.camionId
      ? prisma.camion.findUnique({ where: { id: entrada.camionId } })
      : prisma.camion.findFirst({ where: { activo: true }, orderBy: { id: "asc" } }),
  ]);
  for (const ubicacionId of [entrada.origenId, entrada.destinoId]) {
    const ubicacion = ubicaciones.find((u) => u.id === ubicacionId);
    if (!ubicacion?.activa) throw new HttpError(400, `La ubicación #${ubicacionId} no existe o está inactiva`);
    if (ubicacion.tipo === "APARTADOS") throw new HttpError(400, "Los apartados se manejan desde su sección");
  }
  if (entrada.camionId && !camion?.activo) throw new HttpError(400, "El camión no existe o está inactivo");

  const lineas = entrada.lineas.map(({ productoId, cantidad }) => {
    const producto = productos.find((p) => p.id === productoId);
    if (!producto?.activo) throw new HttpError(400, `El producto #${productoId} no existe o está inactivo`);
    // El peso se copia al crear: si después cambia en el catálogo, este despacho no se altera
    return { productoId, cantidad, pesoUnitarioKg: producto.pesoKg ?? 0 };
  });

  try {
    const despacho = await prisma.despacho.create({
      data: {
        documento: entrada.documento,
        origenId: entrada.origenId,
        destinoId: entrada.destinoId,
        camionId: camion?.id,
        notas: entrada.notas,
        usuarioId,
        lineas: { create: lineas },
      },
      include: incluir,
    });
    return conResumen(despacho);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, `Ya existe un despacho para ${entrada.documento}`);
    }
    throw error;
  }
}

export async function empacarLinea(despachoId: number, lineaId: number, cantidadEmpacada: number) {
  return prisma.$transaction(async (tx) => {
    const despacho = await bloquearDespacho(tx, despachoId);
    exigirEditable(despacho);

    const linea = despacho.lineas.find((l) => l.id === lineaId);
    if (!linea) throw new HttpError(404, `La línea #${lineaId} no es de este despacho`);
    if (cantidadEmpacada > Number(linea.cantidad)) {
      throw new HttpError(400, `${linea.producto.codigo}: el TRA pide ${Number(linea.cantidad)}, no se puede empacar más`);
    }

    // Peso que quedaría en el camión con este cambio
    const pesoNuevo = despacho.lineas.reduce((total, l) => {
      const empacada = l.id === lineaId ? cantidadEmpacada : Number(l.cantidadEmpacada);
      return total + empacada * Number(l.pesoUnitarioKg);
    }, 0);
    if (despacho.camion && pesoNuevo > Number(despacho.camion.capacidadKg) + 0.0001) {
      throw new HttpError(
        409,
        `Se pasa del límite: ${despacho.camion.nombre} admite ${Number(despacho.camion.capacidadKg)} kg ` +
          `y quedaría con ${Math.round(pesoNuevo * 100) / 100} kg`,
      );
    }

    await tx.despachoLinea.update({ where: { id: lineaId }, data: { cantidadEmpacada } });
    const todoEmpacado = despacho.lineas.every((l) =>
      l.id === lineaId ? cantidadEmpacada === Number(l.cantidad) : Number(l.cantidadEmpacada) === Number(l.cantidad),
    );
    const actualizado = await tx.despacho.update({
      where: { id: despachoId },
      data: { estado: todoEmpacado ? "EMPACADO" : "ABIERTO" },
      include: incluir,
    });
    return conResumen(actualizado);
  });
}

export async function actualizarDespacho(id: number, entrada: ActualizarDespachoInput) {
  return prisma.$transaction(async (tx) => {
    const despacho = await bloquearDespacho(tx, id);
    exigirEditable(despacho);

    if (entrada.camionId) {
      const camion = await tx.camion.findUnique({ where: { id: entrada.camionId } });
      if (!camion?.activo) throw new HttpError(400, "El camión no existe o está inactivo");
      const empacado = conResumen(despacho).resumen.pesoEmpacadoKg;
      if (empacado > Number(camion.capacidadKg)) {
        throw new HttpError(409, `Ya hay ${empacado} kg empacados y ${camion.nombre} admite ${Number(camion.capacidadKg)} kg`);
      }
    }
    const actualizado = await tx.despacho.update({ where: { id }, data: entrada, include: incluir });
    return conResumen(actualizado);
  });
}

export async function despachar(id: number, usuarioId: number) {
  return prisma.$transaction(
    async (tx) => {
      const despacho = await bloquearDespacho(tx, id);
      exigirEditable(despacho);
      if (despacho.estado !== "EMPACADO") {
        throw new HttpError(409, "Faltan artículos por empacar");
      }
      if (!despacho.destinoId) throw new HttpError(400, "El despacho no tiene destino");

      // Recién ahora se mueve el stock, en la misma transacción que el cambio de estado
      for (const linea of despacho.lineas) {
        const cantidad = Number(linea.cantidad);
        await restarStock(tx, linea.productoId, despacho.origenId, cantidad);
        await sumarStock(tx, linea.productoId, despacho.destinoId, cantidad);
      }
      await tx.movimiento.createMany({
        data: despacho.lineas.map((linea) => ({
          tipo: "TRASLADO" as const,
          productoId: linea.productoId,
          cantidad: linea.cantidad,
          origenId: despacho.origenId,
          destinoId: despacho.destinoId,
          documento: despacho.documento,
          notas: despacho.camion ? `Despachado en ${despacho.camion.nombre}` : "Despachado",
          despachoId: despacho.id,
          usuarioId,
        })),
      });
      const actualizado = await tx.despacho.update({
        where: { id },
        data: { estado: "DESPACHADO" },
        include: incluir,
      });
      return conResumen(actualizado);
    },
    { timeout: 30_000 },
  );
}

export async function cancelarDespacho(id: number) {
  return prisma.$transaction(async (tx) => {
    const despacho = await bloquearDespacho(tx, id);
    exigirEditable(despacho);
    const actualizado = await tx.despacho.update({
      where: { id },
      data: { estado: "CANCELADO" },
      include: incluir,
    });
    return conResumen(actualizado);
  });
}
