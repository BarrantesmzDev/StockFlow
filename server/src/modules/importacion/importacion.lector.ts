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
