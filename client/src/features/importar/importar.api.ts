import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useInvalidarStock } from "@/features/inventario/inventario.api";
import type { Celda } from "./hojas";

export type MapeoProductos = {
  filaInicio: number;
  filas: Celda[][];
  columnas: { codigo: number; nombre: number; unidad?: number; pesoKg?: number };
  stock: { ubicacionId: number; columna: number }[];
  sugerirPesos: boolean;
  sugerirUnidades: boolean;
  reemplazarStock: boolean;
};

export type AccionFila = "crear" | "actualizar" | "omitir" | "error";

export type FilaVistaPrevia = {
  fila: number;
  accion: AccionFila;
  codigo: string | null;
  nombre: string | null;
  unidad: string;
  pesoKg: number | null;
  stock: { ubicacionId: number; cantidad: number }[];
  stockSeImporta: boolean;
  errores: string[];
  advertencias: string[];
};

export type VistaPrevia = {
  filas: FilaVistaPrevia[];
  resumen: Record<AccionFila, number> & { conAdvertencias: number };
};

export type ResultadoImportacion = {
  productosCreados: number;
  productosActualizados: number;
  ajustesDeStock: number;
  apartadosCreados: number;
  omitidas: number;
  conError: number;
  advertencias: string[];
};

export function usePrevisualizar() {
  return useMutation({
    mutationFn: (mapeo: MapeoProductos) =>
      api<VistaPrevia>("/api/importaciones/productos/previsualizar", { method: "POST", body: mapeo }),
  });
}

export function useConfirmarImportacion() {
  const invalidar = useInvalidarStock();
  return useMutation({
    mutationFn: (datos: MapeoProductos & { fechaCorte?: string }) =>
      api<ResultadoImportacion>("/api/importaciones/productos/confirmar", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}
