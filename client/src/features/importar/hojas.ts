import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Lo que devuelve la API al leer un .xlsx o .csv: cada hoja como tabla.
// filas[0] es la fila 1 de Excel.
export type Celda = string | number | boolean | null;
export type Hoja = { nombre: string; filas: Celda[][] };

export function useLeerArchivo() {
  return useMutation({
    mutationFn: (archivo: File) => api<{ hojas: Hoja[] }>("/api/importaciones/leer", { archivo }),
  });
}

// 0 → A, 25 → Z, 26 → AA
export function letraColumna(indice: number): string {
  let letra = "";
  for (let n = indice + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    letra = String.fromCharCode(65 + ((n - 1) % 26)) + letra;
  }
  return letra;
}

// Primera fila (de las 30 primeras) que tenga una celda "CODIGO": ahí están los encabezados
export function detectarFilaEncabezado(filas: Celda[][]): number {
  const indice = filas.slice(0, 30).findIndex((fila) => fila.some((c) => /^\s*c[oó]digo\s*$/i.test(String(c ?? ""))));
  return indice >= 0 ? indice + 1 : 1;
}

export type Columna = { indice: number; etiqueta: string; encabezado: string };

// Columnas disponibles a partir de la fila de encabezados ("A · CODIGO", "B · PRODUCTOS"...)
export function columnasDe(filas: Celda[][], filaEncabezado: number): Columna[] {
  const encabezados = filas[filaEncabezado - 1] ?? [];
  const ancho = Math.max(encabezados.length, ...filas.slice(filaEncabezado, filaEncabezado + 50).map((f) => f.length), 0);
  return Array.from({ length: ancho }, (_, indice) => {
    const encabezado = String(encabezados[indice] ?? "").trim();
    return { indice, encabezado, etiqueta: `${letraColumna(indice)} · ${encabezado || "(sin título)"}` };
  });
}

// La primera columna cuyo encabezado coincide con alguno de los patrones
export function buscarColumna(columnas: Columna[], ...patrones: RegExp[]): number | undefined {
  for (const patron of patrones) {
    const encontrada = columnas.find((c) => patron.test(c.encabezado));
    if (encontrada) return encontrada.indice;
  }
  return undefined;
}
