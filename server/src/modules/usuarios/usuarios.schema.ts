import { z } from "../../lib/zod.ts";
import { emailSchema, passwordSchema } from "../auth/auth.schema.ts";

const rol = z.enum(["ADMIN", "OPERADOR", "CONSULTA"]);
const nombre = z.string().trim().min(1, "El nombre es obligatorio").max(100);

export const crearUsuarioSchema = z.strictObject({
  nombre,
  email: emailSchema,
  password: passwordSchema,
  rol: rol.default("OPERADOR"),
});

export const actualizarUsuarioSchema = z
  .strictObject({
    nombre: nombre.optional(),
    rol: rol.optional(),
    activo: z.boolean().optional(),
    password: passwordSchema.optional(), // el admin le asigna una contraseña nueva
  })
  .refine((datos) => Object.keys(datos).length > 0, "Envía al menos un campo para actualizar");

export type CrearUsuarioInput = z.infer<typeof crearUsuarioSchema>;
export type ActualizarUsuarioInput = z.infer<typeof actualizarUsuarioSchema>;
