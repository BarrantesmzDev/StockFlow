import type { Prisma } from "../../generated/prisma/client.ts";
import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { bodegaPrincipal, ubicacionApartados } from "../inventario/stock.ts";
import { leerArchivo } from "./importacion.lector.ts";
import { armarVistaPrevia, type ContextoImportacion } from "./importacion.productos.ts";
import type { ImportarProductosInput } from "./importacion.schema.ts";

export async function leerHojas(contenido: Buffer) {
  // .xls (Excel 97-2003) es binario y no se puede leer: empieza con D0 CF 11 E0
  if (contenido[0] === 0xd0 && contenido[1] === 0xcf) {
    throw new HttpError(400, "El archivo es .xls antiguo: ábrelo en Excel y guárdalo como .xlsx");
  }
  try {
    return await leerArchivo(contenido);
  } catch {
    throw new HttpError(400, "No se pudo leer el archivo. ¿Es un .xlsx o .csv válido?");
  }
}

async function cargarContexto(): Promise<ContextoImportacion> {
  const [productos, ubicaciones] = await Promise.all([
    prisma.producto.findMany({ select: { codigo: true } }),
    prisma.ubicacion.findMany({ where: { activa: true } }),
  ]);
  return {
    codigosExistentes: new Set(productos.map((p) => p.codigo)),
    ubicaciones: new Map(ubicaciones.map((u) => [u.id, u.nombre])),
  };
}

export async function previsualizarProductos(entrada: ImportarProductosInput) {
  return armarVistaPrevia(entrada, await cargarContexto());
}

// Importa el catálogo y el saldo inicial en UNA transacción. Vuelve a validar todo en el servidor:
// nunca se confía en la vista previa que tiene el navegador.
export async function confirmarProductos(
  entrada: ImportarProductosInput & { fechaCorte?: Date },
  usuarioId: number,
) {
  const vista = armarVistaPrevia(entrada, await cargarContexto());
  const validas = vista.filas.filter((f) => f.accion === "crear" || f.accion === "actualizar");
  if (validas.length === 0) throw new HttpError(400, "No hay filas válidas para importar");
  const fecha = entrada.fechaCorte ?? new Date();

  return prisma.$transaction(
    async (tx) => {
      const ubicaciones = await tx.ubicacion.findMany({ where: { activa: true } });
      const apartados = await ubicacionApartados(tx);
      const principal = await bodegaPrincipal(tx);
      const advertencias: string[] = [];

      // 1. Productos nuevos: un solo INSERT con todas las filas (createMany)
      const nuevas = validas.filter((f) => f.accion === "crear");
      await tx.producto.createMany({
        data: nuevas.map((f) => ({ codigo: f.codigo!, nombre: f.nombre!, unidad: f.unidad, pesoKg: f.pesoKg })),
      });

      // 2. Existentes: se actualiza el nombre; unidad y peso solo si el producto no los tenía
      const existentes = validas.filter((f) => f.accion === "actualizar");
      const actuales = await tx.producto.findMany({ where: { codigo: { in: existentes.map((f) => f.codigo!) } } });
      for (const fila of existentes) {
        const actual = actuales.find((p) => p.codigo === fila.codigo)!;
        await tx.producto.update({
          where: { id: actual.id },
          data: {
            nombre: fila.nombre!,
            unidad: actual.unidad === "UND" ? fila.unidad : undefined,
            pesoKg: actual.pesoKg === null ? fila.pesoKg : undefined,
          },
        });
      }

      // 3. Saldo inicial: se deja el stock en lo que dice el archivo, registrando la diferencia
      //    como AJUSTE para que el historial explique de dónde salió cada cantidad
      const productos = await tx.producto.findMany({
        where: { codigo: { in: validas.map((f) => f.codigo!) } },
        select: { id: true, codigo: true },
      });
      const idPorCodigo = new Map(productos.map((p) => [p.codigo, p.id]));
      const stockActual = await tx.stock.findMany({ where: { productoId: { in: productos.map((p) => p.id) } } });
      const actualDe = (productoId: number, ubicacionId: number) =>
        Number(stockActual.find((s) => s.productoId === productoId && s.ubicacionId === ubicacionId)?.cantidad ?? 0);

      const movimientos: Prisma.MovimientoCreateManyInput[] = [];
      const stockNuevo: Prisma.StockCreateManyInput[] = [];
      let apartadosCreados = 0;

      for (const fila of validas.filter((f) => f.stockSeImporta)) {
        const productoId = idPorCodigo.get(fila.codigo!)!;
        for (const { ubicacionId, cantidad } of fila.stock) {
          const actual = actualDe(productoId, ubicacionId);
          const diferencia = Math.round((cantidad - actual) * 100) / 100;
          if (diferencia === 0) continue;
          const ubicacion = ubicaciones.find((u) => u.id === ubicacionId)!;

          // En Apartados el stock debe ser la suma de apartados activos: solo se carga si está vacío,
          // y se crea un apartado "sin cliente" para poder entregarlo o cancelarlo después
          if (ubicacion.id === apartados.id) {
            if (actual !== 0) {
              advertencias.push(`${fila.codigo}: ya tiene apartados; ajústalos desde la sección Apartados`);
              continue;
            }
            const apartado = await tx.apartado.create({
              data: {
                cliente: "SALDO INICIAL (sin cliente)",
                productoId,
                cantidad,
                origenId: principal.id,
                notas: "Importado desde Excel",
                usuarioId,
                creadoEn: fecha,
              },
            });
            apartadosCreados++;
            movimientos.push(ajuste(productoId, cantidad, null, ubicacionId, fecha, usuarioId, apartado.id));
          } else {
            movimientos.push(
              ajuste(productoId, Math.abs(diferencia), diferencia < 0 ? ubicacionId : null, diferencia > 0 ? ubicacionId : null, fecha, usuarioId),
            );
          }

          if (stockActual.some((s) => s.productoId === productoId && s.ubicacionId === ubicacionId)) {
            await tx.stock.update({
              where: { productoId_ubicacionId: { productoId, ubicacionId } },
              data: { cantidad },
            });
          } else {
            stockNuevo.push({ productoId, ubicacionId, cantidad });
          }
        }
      }
      await tx.stock.createMany({ data: stockNuevo });
      await tx.movimiento.createMany({ data: movimientos });

      return {
        productosCreados: nuevas.length,
        productosActualizados: existentes.length,
        ajustesDeStock: movimientos.length,
        apartadosCreados,
        omitidas: vista.resumen.omitir,
        conError: vista.resumen.error,
        advertencias,
      };
    },
    { timeout: 120_000, maxWait: 10_000 },
  );
}

function ajuste(
  productoId: number,
  cantidad: number,
  origenId: number | null,
  destinoId: number | null,
  fecha: Date,
  usuarioId: number,
  apartadoId?: number,
): Prisma.MovimientoCreateManyInput {
  return {
    tipo: "AJUSTE",
    productoId,
    cantidad,
    origenId,
    destinoId,
    documento: "IMPORTACION",
    notas: "Saldo inicial importado desde Excel",
    fecha,
    usuarioId,
    apartadoId,
  };
}
