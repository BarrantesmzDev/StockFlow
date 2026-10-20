import ExcelJS from "exceljs";

// Valor "plano" de una celda, listo para viajar como JSON
export type Celda = string | number | boolean | null;

// filas[0] es la fila 1 de Excel: así los números de fila coinciden con los que ve el usuario
export type Hoja = { nombre: string; filas: Celda[][] };

export const MAX_FILAS = 20_000;
export const MAX_COLUMNAS = 50;

// Lee un .xlsx y devuelve cada hoja visible como una tabla de valores.
// Las fórmulas se reemplazan por su último resultado (el que Excel guardó al grabar el archivo).
export async function leerExcel(contenido: Buffer): Promise<Hoja[]> {
  const libro = new ExcelJS.Workbook();
  // exceljs declara su propio tipo Buffer; el de Node es compatible
  await libro.xlsx.load(contenido as unknown as ExcelJS.Buffer);

  return libro.worksheets
    .filter((hoja) => hoja.state === "visible")
    .map((hoja) => {
      const filas: Celda[][] = [];
      hoja.eachRow({ includeEmpty: false }, (fila, numero) => {
        if (numero > MAX_FILAS) return;
        const valores: Celda[] = [];
        fila.eachCell({ includeEmpty: false }, (celda, columna) => {
          if (columna <= MAX_COLUMNAS) valores[columna - 1] = aCelda(celda.value);
        });
        filas[numero - 1] = Array.from(valores, (v) => v ?? null);
      });
      // Las filas vacías intermedias quedan como [] para no correr la numeración
      return { nombre: hoja.name, filas: Array.from(filas, (f) => f ?? []) };
    });
}

// Lee un CSV como una sola hoja. Detecta si el separador es "," o ";" (Excel en español usa ";").
// Respeta comillas: "Tubería 1"", flexible" es un solo campo.
export function leerCsv(contenido: Buffer): Hoja[] {
  const texto = contenido.toString("utf8").replace(/^﻿/, ""); // quita el BOM de Excel
  const primeraLinea = texto.slice(0, texto.indexOf("\n") >>> 0);
  const separador = (primeraLinea.match(/;/g)?.length ?? 0) > (primeraLinea.match(/,/g)?.length ?? 0) ? ";" : ",";

  const filas: Celda[][] = [];
  let fila: Celda[] = [];
  let campo = "";
  let entreComillas = false;
  const cerrarCampo = () => {
    const valor = campo.trim();
    fila.push(valor === "" ? null : valor);
    campo = "";
  };
  for (let i = 0; i < texto.length && filas.length < MAX_FILAS; i++) {
    const c = texto[i];
    if (entreComillas) {
      if (c === '"' && texto[i + 1] === '"') {
        campo += '"';
        i++;
      } else if (c === '"') entreComillas = false;
      else campo += c;
    } else if (c === '"') entreComillas = true;
    else if (c === separador) cerrarCampo();
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && texto[i + 1] === "\n") i++;
      cerrarCampo();
      filas.push(fila.slice(0, MAX_COLUMNAS));
      fila = [];
    } else campo += c;
  }
  if (campo !== "" || fila.length > 0) {
    cerrarCampo();
    filas.push(fila.slice(0, MAX_COLUMNAS));
  }
  return [{ nombre: "CSV", filas }];
}

// .xlsx es un ZIP: empieza con los bytes "PK". Si no, se intenta como CSV.
export async function leerArchivo(contenido: Buffer): Promise<Hoja[]> {
  const esZip = contenido.length > 4 && contenido[0] === 0x50 && contenido[1] === 0x4b;
  return esZip ? leerExcel(contenido) : leerCsv(contenido);
}

function aCelda(valor: ExcelJS.CellValue): Celda {
  if (valor === null || valor === undefined) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  if (typeof valor === "object") {
    if ("result" in valor) return aCelda(valor.result as ExcelJS.CellValue); // fórmula
    if ("richText" in valor) return valor.richText.map((parte) => parte.text).join("");
    if ("text" in valor) return String(valor.text); // hipervínculo
    return null; // error de Excel (#N/A, #REF!) o fórmula sin resultado guardado
  }
  return valor;
}
