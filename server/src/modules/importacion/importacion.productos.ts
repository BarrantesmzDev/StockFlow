import { crearProductoSchema } from "../productos/productos.schema.ts";
import type { Celda } from "./importacion.lector.ts";
import {
  leerNumero,
  normalizarCodigo,
  normalizarTexto,
  redondear,
  sugerirPesoKg,
  sugerirUnidad,
} from "./importacion.normalizar.ts";
import type { ImportarProductosInput } from "./importacion.schema.ts";

export type AccionFila = "crear" | "actualizar" | "omitir" | "error";

export type FilaVistaPrevia = {
  fila: number; // número de fila en Excel, para que el usuario la encuentre
  accion: AccionFila;
  codigo: string | null;
  nombre: string | null;
  unidad: string;
  pesoKg: number | null;
  stock: { ubicacionId: number; cantidad: number }[];
  stockSeImporta: boolean; // false = producto existente y no se pidió reemplazar su stock
  errores: string[];
  advertencias: string[];
};

export type VistaPrevia = {
  filas: FilaVistaPrevia[];
  resumen: Record<AccionFila, number> & { conAdvertencias: number };
};

// Lo que hay que saber de la base de datos para clasificar cada fila
export type ContextoImportacion = {
  codigosExistentes: Set<string>;
  ubicaciones: Map<number, string>; // id → nombre
};

// Función pura: no toca la base de datos. Recibe las filas del Excel y devuelve qué pasaría
// con cada una. La usan tanto la vista previa como la confirmación (que vuelve a validar todo).
export function armarVistaPrevia(
  entrada: ImportarProductosInput,
  contexto: ContextoImportacion,
): VistaPrevia {
  const { filaInicio, filas, columnas, stock, sugerirPesos, sugerirUnidades, reemplazarStock } = entrada;
  const primeraFilaPorCodigo = new Map<string, number>();
  const resultado: FilaVistaPrevia[] = [];

  filas.forEach((valores, indice) => {
    const numeroFila = filaInicio + indice;
    const leer = (col: number | undefined): Celda => (col === undefined ? null : (valores[col] ?? null));

    const codigo = normalizarCodigo(leer(columnas.codigo));
    const nombre = normalizarTexto(leer(columnas.nombre));
    if (codigo === null && nombre === null) return; // fila vacía o de totales: se ignora

    const errores: string[] = [];
    const advertencias: string[] = [];

    // Unidad: la columna del Excel manda; si no hay, se sugiere desde el nombre
    let unidad = normalizarCodigo(leer(columnas.unidad)) ?? "UND";
    if (columnas.unidad === undefined && sugerirUnidades && nombre) {
      const sugerida = sugerirUnidad(nombre);
      if (sugerida) {
        unidad = sugerida;
        advertencias.push(`Unidad sugerida desde el nombre: ${sugerida}`);
      }
    }

    // Peso: igual que la unidad
    let pesoKg: number | null = null;
    const pesoExcel = leerNumero(leer(columnas.pesoKg));
    if (pesoExcel === "invalido") {
      errores.push(`Peso: "${leer(columnas.pesoKg)}" no es un número`);
    } else if (pesoExcel !== null && pesoExcel > 0) {
      pesoKg = redondear(pesoExcel, 3);
    } else if (sugerirPesos && nombre) {
      const sugerido = sugerirPesoKg(nombre);
      if (sugerido) {
        pesoKg = sugerido.pesoKg;
        advertencias.push(`Peso sugerido desde el nombre: "${sugerido.texto}" → ${sugerido.pesoKg} kg`);
      }
    }

    // Mismas reglas que crear un producto desde la pantalla (Zod)
    // ("" en vez de null para que el mensaje sea "El código es obligatorio")
    const validacion = crearProductoSchema.safeParse({
      codigo: codigo ?? "",
      nombre: nombre ?? "",
      unidad,
      pesoKg,
    });
    if (!validacion.success) {
      for (const issue of validacion.error.issues) {
        errores.push(`${issue.path.join(".") || "fila"}: ${issue.message}`);
      }
    }

    // Saldo inicial por ubicación
    const cantidades = stock.map(({ ubicacionId, columna }) => {
      const nombreUbicacion = contexto.ubicaciones.get(ubicacionId) ?? `#${ubicacionId}`;
      const valor = leerNumero(leer(columna));
      if (valor === "invalido") {
        errores.push(`Stock ${nombreUbicacion}: "${leer(columna)}" no es un número`);
        return { ubicacionId, cantidad: 0 };
      }
      if (valor !== null && valor < 0) {
        advertencias.push(
          `Stock ${nombreUbicacion} negativo (${redondear(valor, 2)}): se importa 0, requiere conteo físico`,
        );
        return { ubicacionId, cantidad: 0 };
      }
      return { ubicacionId, cantidad: redondear(valor ?? 0, 2) };
    });
    for (const { ubicacionId } of stock) {
      if (!contexto.ubicaciones.has(ubicacionId)) errores.push(`La ubicación #${ubicacionId} no existe`);
    }

    // Código repetido dentro del mismo archivo: vale la primera aparición
    let accion: AccionFila;
    const primeraFila = codigo ? primeraFilaPorCodigo.get(codigo) : undefined;
    if (errores.length > 0) {
      accion = "error";
    } else if (primeraFila !== undefined) {
      accion = "omitir";
      advertencias.push(`Código repetido: ya viene en la fila ${primeraFila}`);
    } else {
      accion = contexto.codigosExistentes.has(codigo!) ? "actualizar" : "crear";
    }
    if (codigo && primeraFila === undefined) primeraFilaPorCodigo.set(codigo, numeroFila);

    resultado.push({
      fila: numeroFila,
      accion,
      codigo,
      nombre,
      unidad,
      pesoKg,
      stock: cantidades,
      stockSeImporta: accion === "crear" || (accion === "actualizar" && reemplazarStock),
      errores,
      advertencias,
    });
  });

  const resumen = { crear: 0, actualizar: 0, omitir: 0, error: 0, conAdvertencias: 0 };
  for (const fila of resultado) {
    resumen[fila.accion]++;
    if (fila.advertencias.length > 0) resumen.conAdvertencias++;
  }
  return { filas: resultado, resumen };
}
