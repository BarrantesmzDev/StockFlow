import { Prisma } from "../../generated/prisma/client.ts";
import { prisma } from "../../lib/prisma.ts";
import { HttpError } from "../../lib/http-error.ts";
import type {
  ActualizarProductoInput,
  CrearProductoInput,
  ListarProductosFiltros,
} from "./productos.schema.ts";

// Lógica de productos. No sabe nada de HTTP (req/res): la usan las rutas
// y más adelante la importación de Excel.

export async function listarProductos({ buscar, incluirInactivos }: ListarProductosFiltros) {
  return prisma.producto.findMany({
    where: {
      // undefined = Prisma ignora ese filtro
      activo: incluirInactivos ? undefined : true,
      OR: buscar
        ? [
            { codigo: { contains: buscar, mode: "insensitive" } },
            { nombre: { contains: buscar, mode: "insensitive" } },
          ]
        : undefined,
    },
    orderBy: { codigo: "asc" },
  });
}

export async function obtenerProducto(id: number) {
  const producto = await prisma.producto.findUnique({ where: { id } });
  if (!producto) {
    throw new HttpError(404, `No existe el producto con id ${id}`);
  }
  return producto;
}

export async function crearProducto(datos: CrearProductoInput) {
  try {
    return await prisma.producto.create({ data: datos });
  } catch (error) {
    traducirErrorPrisma(error, { codigo: datos.codigo });
  }
}

export async function actualizarProducto(id: number, datos: ActualizarProductoInput) {
  try {
    return await prisma.producto.update({ where: { id }, data: datos });
  } catch (error) {
    traducirErrorPrisma(error, { id, codigo: datos.codigo });
  }
}

// Soft delete: no se borra la fila (los movimientos la referencian), solo se desactiva.
export async function desactivarProducto(id: number) {
  try {
    return await prisma.producto.update({ where: { id }, data: { activo: false } });
  } catch (error) {
    traducirErrorPrisma(error, { id });
  }
}

// Convierte errores conocidos de la BD en errores HTTP con un mensaje claro.
// P2002 = violación de UNIQUE (código repetido). P2025 = la fila no existe.
function traducirErrorPrisma(error: unknown, contexto: { id?: number; codigo?: string }): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      throw new HttpError(409, `Ya existe un producto con el código "${contexto.codigo}"`);
    }
    if (error.code === "P2025") {
      throw new HttpError(404, `No existe el producto con id ${contexto.id}`);
    }
  }
  throw error;
}
