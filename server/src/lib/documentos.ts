import { z } from "./zod.ts";

// TRA = documento de movimiento INTERNO de mercadería (traslados entre ubicaciones propias).
// En el Excel aparece escrito de muchas formas: "tra-2426", "TRA2439", "2394". Siempre se guarda
// como "TRA-2394" para que buscar por TRA encuentre todo.
export function normalizarTra(valor: string): string {
  const limpio = valor.trim().toUpperCase().replace(/\s+/g, "");
  const numero = limpio.match(/^(?:TRA)?-?(\d+)$/);
  return numero ? `TRA-${numero[1]}` : limpio;
}

export const traSchema = z
  .string()
  .trim()
  .transform(normalizarTra)
  .pipe(z.string().regex(/^TRA-\d+$/, "El TRA debe ser un número, ej. TRA-2394"));

// Texto opcional: "" y espacios cuentan como "no viene"
export const textoOpcional = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((valor) => (valor ? valor : undefined));

export const textoObligatorio = (max: number, mensaje: string) =>
  z.string().trim().min(1, mensaje).max(max);
