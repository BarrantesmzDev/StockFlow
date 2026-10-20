import { prisma } from "../../lib/prisma.ts";
import {
  leerNumero,
  normalizarCodigo,
  normalizarTexto,
  redondear,
} from "../importacion/importacion.normalizar.ts";
import { bodegaPrincipal } from "./stock.ts";
import type { ImportarSistemaCrInput, VerInventarioFiltros } from "./inventario.schema.ts";

// Reemplaza la hoja INVENTARIO del Excel: stock por ubicación, total y diferencia contra SistemaCR.
// DIFERENCIA = stock en la bodega principal − cantidad en SistemaCR (igual que en el Excel).
export async function verInventario(filtros: VerInventarioFiltros) {
  const { buscar, soloDiferencias, soloConStock, incluirInactivos } = filtros;
  const [ubicaciones, principal, productos, sistema] = await Promise.all([
    prisma.ubicacion.findMany({ where: { activa: true }, orderBy: { id: "asc" } }),
    bodegaPrincipal(prisma),
    prisma.producto.findMany({
      where: {
        activo: incluirInactivos ? undefined : true,
        OR: buscar
          ? [
              { codigo: { contains: buscar, mode: "insensitive" } },
              { nombre: { contains: buscar, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: { stock: true },
      orderBy: { codigo: "asc" },
    }),
    prisma.sistemaCr.findMany(),
  ]);

  const sistemaPorCodigo = new Map(sistema.map((s) => [s.codigo, s]));

  const filas = productos
    .map((producto) => {
      const stock: Record<number, number> = {};
      for (const ubicacion of ubicaciones) stock[ubicacion.id] = 0;
      for (const s of producto.stock) stock[s.ubicacionId] = Number(s.cantidad);
      const total = redondear(Object.values(stock).reduce((a, b) => a + b, 0), 2);

      // Si el producto no está en la exportación de SistemaCR no hay con qué comparar
      // (igual que el IFERROR del Excel): la diferencia queda vacía, no se inventa un 0
      const enSistema = sistemaPorCodigo.get(producto.codigo);
      const sistemaCr = enSistema ? Number(enSistema.cantidad) : null;
      const diferencia = sistemaCr === null ? null : redondear(stock[principal.id] - sistemaCr, 2);

      return {
        id: producto.id,
        codigo: producto.codigo,
        nombre: producto.nombre,
        unidad: producto.unidad,
        pesoKg: producto.pesoKg,
        activo: producto.activo,
        stock,
        total,
        sistemaCr,
        diferencia,
      };
    })
    .filter((fila) => !soloConStock || fila.total !== 0)
    .filter((fila) => !soloDiferencias || (fila.diferencia !== null && fila.diferencia !== 0));

  // Códigos que SistemaCR tiene y StockFlow no: hay que crearlos o corregir el código
  const codigos = new Set((await prisma.producto.findMany({ select: { codigo: true } })).map((p) => p.codigo));
  const sinProducto = sistema
    .filter((s) => !codigos.has(s.codigo))
    .map((s) => ({ codigo: s.codigo, nombre: s.nombre, cantidad: Number(s.cantidad) }));

  return {
    ubicaciones,
    principalId: principal.id,
    sistemaCrImportadoEn: sistema[0]?.importadoEn ?? null,
    filas,
    sinProducto,
    resumen: {
      productos: filas.length,
      conDiferencia: filas.filter((f) => f.diferencia !== null && f.diferencia !== 0).length,
    },
  };
}

// Carga una exportación nueva de SistemaCR. Reemplaza la anterior completa (no se mezclan fechas).
export async function importarSistemaCr({ filaInicio, filas, columnas }: ImportarSistemaCrInput) {
  const porCodigo = new Map<string, { codigo: string; nombre: string | null; cantidad: number }>();
  const errores: string[] = [];
  let duplicados = 0;

  filas.forEach((valores, indice) => {
    const fila = filaInicio + indice;
    const codigo = normalizarCodigo(valores[columnas.codigo] ?? null);
    if (!codigo) return; // fila vacía
    const cantidad = leerNumero(valores[columnas.cantidad] ?? null);
    if (cantidad === "invalido") {
      errores.push(`Fila ${fila} (${codigo}): la cantidad "${valores[columnas.cantidad]}" no es un número`);
      return;
    }
    const nombre = columnas.nombre === undefined ? null : normalizarTexto(valores[columnas.nombre] ?? null);
    const anterior = porCodigo.get(codigo);
    if (anterior) {
      // El mismo código dos veces: se suman (ej. el sistema lo lista por lote)
      duplicados++;
      anterior.cantidad = redondear(anterior.cantidad + (cantidad ?? 0), 2);
    } else {
      porCodigo.set(codigo, { codigo, nombre: nombre?.slice(0, 300) ?? null, cantidad: redondear(cantidad ?? 0, 2) });
    }
  });

  const datos = [...porCodigo.values()];
  const importadoEn = new Date();
  await prisma.$transaction([
    prisma.sistemaCr.deleteMany(),
    prisma.sistemaCr.createMany({ data: datos.map((d) => ({ ...d, importadoEn })) }),
  ]);
  return { importados: datos.length, duplicados, errores };
}
