import type { Celda } from "./importacion.lector.ts";

// Limpieza de los valores que vienen de Excel antes de validarlos.

// 7634 → "7634", " soda25 " → "SODA25". Excel guarda los códigos numéricos como número.
export function normalizarCodigo(valor: Celda): string | null {
  if (valor === null) return null;
  const texto = String(valor).trim().replace(/\s+/g, " ").toUpperCase();
  return texto === "" ? null : texto;
}

// Quita espacios repetidos: "Cloro  Granular   50 Kg" → "Cloro Granular 50 Kg"
export function normalizarTexto(valor: Celda): string | null {
  if (valor === null) return null;
  const texto = String(valor).trim().replace(/\s+/g, " ");
  return texto === "" ? null : texto;
}

// 4.5, "4.5" y "4,5" → 4.5. Vacío → null. "2,35,75" o "abc" → "invalido".
export function leerNumero(valor: Celda): number | null | "invalido" {
  if (valor === null) return null;
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : "invalido";
  if (typeof valor === "boolean") return "invalido";
  const texto = valor.replace(/\s/g, "");
  if (texto === "") return null;
  if (!/^-?\d+([.,]\d+)?$/.test(texto)) return "invalido";
  return Number(texto.replace(",", "."));
}

// Excel guarda 376.75 como 376.7500000000002: se redondea a los decimales de la columna
export function redondear(numero: number, decimales: number): number {
  const factor = 10 ** decimales;
  return Math.round((numero + Number.EPSILON) * factor) / factor;
}

const LIBRA_KG = 0.45359237;
const PESO_EN_NOMBRE = /(\d+(?:[.,]\d+)?)\s*(kgs?|kilos?|lbs?|libras?)\b/i;
// En equipos las libras del nombre NO son el peso: "Filtro 80 Gpm 350 Lbs" es la arena que
// lleva el filtro y "Manómetro 0-60 lbs" es presión.
const NO_ES_PESO = /gpm|\d+\s*-\s*\d+\s*(lbs?|libras?)\b/i;

// "Saco 50Lbs" → 22.68 kg, "Cloro 4,5 Kg" → 4.5 kg. null si el nombre no trae un peso confiable.
export function sugerirPesoKg(nombre: string): { pesoKg: number; texto: string } | null {
  if (NO_ES_PESO.test(nombre)) return null;
  const encontrado = nombre.match(PESO_EN_NOMBRE);
  if (!encontrado) return null;
  const cantidad = Number(encontrado[1].replace(",", "."));
  const enLibras = encontrado[2].toLowerCase().startsWith("l");
  const pesoKg = redondear(enLibras ? cantidad * LIBRA_KG : cantidad, 3);
  return pesoKg > 0 ? { pesoKg, texto: encontrado[0] } : null;
}

// "(2.05 M2 P/Caja)" → M2 (se vende por metro cuadrado), "Por Metro" → M. Si no, null.
export function sugerirUnidad(nombre: string): string | null {
  if (/m2|m²/i.test(nombre) && /(p\/|por|x)\s*caja/i.test(nombre)) return "M2";
  if (/por\s+metro/i.test(nombre)) return "M";
  return null;
}
