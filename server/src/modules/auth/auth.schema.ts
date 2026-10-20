import { z } from "../../lib/zod.ts";

export const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Correo inválido"));
export const passwordSchema = z
  .string()
  .min(8, "La contraseña debe tener al menos 8 caracteres")
  .max(200);

export const loginSchema = z.strictObject({
  email: emailSchema,
  password: z.string().min(1, "Escribe tu contraseña"),
});

export const configurarSchema = z.strictObject({
  nombre: z.string().trim().min(1, "Escribe tu nombre").max(100),
  email: emailSchema,
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof loginSchema>;
export type ConfigurarInput = z.infer<typeof configurarSchema>;
