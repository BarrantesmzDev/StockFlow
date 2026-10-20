import { Prisma } from "../../generated/prisma/client.ts";
import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import { hashPassword } from "../auth/auth.service.ts";
import type { ActualizarUsuarioInput, CrearUsuarioInput } from "./usuarios.schema.ts";

// Nunca se devuelve passwordHash
const columnas = {
  id: true,
  nombre: true,
  email: true,
  rol: true,
  activo: true,
  creadoEn: true,
  ultimoAccesoEn: true,
} as const;

export async function listarUsuarios() {
  return prisma.usuario.findMany({ select: columnas, orderBy: [{ activo: "desc" }, { nombre: "asc" }] });
}

export async function crearUsuario({ password, ...datos }: CrearUsuarioInput) {
  try {
    return await prisma.usuario.create({
      data: { ...datos, passwordHash: await hashPassword(password) },
      select: columnas,
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new HttpError(409, `Ya existe un usuario con el correo ${datos.email}`);
    }
    throw error;
  }
}

export async function actualizarUsuario(id: number, { password, ...datos }: ActualizarUsuarioInput) {
  return prisma.$transaction(async (tx) => {
    const usuario = await tx.usuario.findUnique({ where: { id } });
    if (!usuario) throw new HttpError(404, `No existe el usuario con id ${id}`);

    // Nunca puede quedar el sistema sin un administrador activo
    const dejaDeSerAdmin =
      usuario.rol === "ADMIN" && usuario.activo && (datos.activo === false || (datos.rol && datos.rol !== "ADMIN"));
    if (dejaDeSerAdmin) {
      const admins = await tx.usuario.count({ where: { rol: "ADMIN", activo: true } });
      if (admins <= 1) throw new HttpError(409, "Debe quedar al menos un administrador activo");
    }

    const actualizado = await tx.usuario.update({
      where: { id },
      data: { ...datos, ...(password ? { passwordHash: await hashPassword(password) } : {}) },
      select: columnas,
    });

    // Si se desactiva o se le cambia la contraseña, se cierran sus sesiones abiertas
    if (datos.activo === false || password) {
      await tx.sesion.deleteMany({ where: { usuarioId: id } });
    }
    return actualizado;
  });
}
