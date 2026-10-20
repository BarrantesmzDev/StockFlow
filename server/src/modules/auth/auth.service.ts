import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Rol, Usuario } from "../../generated/prisma/client.ts";
import { HttpError } from "../../lib/http-error.ts";
import { prisma } from "../../lib/prisma.ts";
import type { ConfigurarInput, LoginInput } from "./auth.schema.ts";

const scryptAsync = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  largo: number,
) => Promise<Buffer>;

const DIA_MS = 24 * 60 * 60 * 1000;
const DURACION_SESION_MS = 7 * DIA_MS;

export type UsuarioSesion = { id: number; nombre: string; email: string; rol: Rol };

// ---------- Contraseñas ----------
// scrypt es lento a propósito: probar millones de contraseñas contra un hash robado sale carísimo.
// Se guarda "scrypt$salt$hash"; el salt aleatorio hace que dos contraseñas iguales den hashes distintos.

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

async function verificarPassword(password: string, guardado: string): Promise<boolean> {
  const [algoritmo, salt, hash] = guardado.split("$");
  if (algoritmo !== "scrypt" || !salt || !hash) return false;
  const esperado = Buffer.from(hash, "base64");
  const calculado = await scryptAsync(password, Buffer.from(salt, "base64"), esperado.length);
  // Comparación en tiempo constante: no revela cuántos caracteres coinciden
  return timingSafeEqual(esperado, calculado);
}

// ---------- Sesiones ----------
// El navegador guarda un token aleatorio; la base guarda solo su SHA-256.

const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

const publico = (u: Usuario): UsuarioSesion => ({
  id: u.id,
  nombre: u.nombre,
  email: u.email,
  rol: u.rol,
});

async function crearSesion(usuarioId: number): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.sesion.create({
    data: { id: hashToken(token), usuarioId, expiraEn: new Date(Date.now() + DURACION_SESION_MS) },
  });
  return token;
}

export async function iniciarSesion({ email, password }: LoginInput) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  const valido = usuario?.activo === true && (await verificarPassword(password, usuario.passwordHash));
  // Mismo mensaje si el correo no existe o la contraseña está mal: no se revela qué correos existen
  if (!usuario || !valido) throw new HttpError(401, "Correo o contraseña incorrectos");

  await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAccesoEn: new Date() } });
  return { token: await crearSesion(usuario.id), usuario: publico(usuario) };
}

export async function validarSesion(token: string): Promise<UsuarioSesion | null> {
  const sesion = await prisma.sesion.findUnique({
    where: { id: hashToken(token) },
    include: { usuario: true },
  });
  if (!sesion || sesion.expiraEn < new Date() || !sesion.usuario.activo) return null;

  // Sesión "deslizante": si se usa, se extiende. Solo se escribe una vez al día como máximo.
  if (sesion.expiraEn.getTime() - Date.now() < DURACION_SESION_MS - DIA_MS) {
    await prisma.sesion.update({
      where: { id: sesion.id },
      data: { expiraEn: new Date(Date.now() + DURACION_SESION_MS) },
    });
  }
  return publico(sesion.usuario);
}

export async function cerrarSesion(token: string) {
  await prisma.sesion.deleteMany({ where: { id: hashToken(token) } });
}

// ---------- Primera configuración ----------
// En una instalación nueva no hay usuarios: la primera persona crea el administrador.

export async function necesitaConfiguracion(): Promise<boolean> {
  return (await prisma.usuario.count()) === 0;
}

export async function configurarInicial({ nombre, email, password }: ConfigurarInput) {
  // Si el servidor define ADMIN_EMAIL, solo ese correo puede crear el primer administrador.
  // Evita que un desconocido que encuentre la URL recién publicada se adueñe de la instalación.
  const permitido = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (permitido && email !== permitido) {
    throw new HttpError(403, "Este correo no está autorizado para configurar StockFlow");
  }
  const passwordHash = await hashPassword(password);
  // Serializable: si dos personas lo intentan a la vez, solo una crea el administrador
  const usuario = await prisma.$transaction(
    async (tx) => {
      if ((await tx.usuario.count()) > 0) {
        throw new HttpError(409, "StockFlow ya está configurado. Inicia sesión.");
      }
      return tx.usuario.create({ data: { nombre, email, passwordHash, rol: "ADMIN" } });
    },
    { isolationLevel: "Serializable" },
  );
  return { token: await crearSesion(usuario.id), usuario: publico(usuario) };
}
