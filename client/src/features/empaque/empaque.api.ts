import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Camion } from "@/features/catalogos/catalogos.api";
import { useInvalidarStock } from "@/features/inventario/inventario.api";

export type EstadoDespacho = "ABIERTO" | "EMPACADO" | "DESPACHADO" | "CANCELADO";

export type LineaDespacho = {
  id: number;
  productoId: number;
  cantidad: string;
  cantidadEmpacada: string;
  pesoUnitarioKg: string;
  disponibleOrigen?: number; // stock actual en la ubicación de origen
  producto: { codigo: string; nombre: string; unidad: string };
};

export type Despacho = {
  id: number;
  documento: string; // TRA-2394
  estado: EstadoDespacho;
  notas: string | null;
  creadoEn: string;
  origen: { id: number; nombre: string };
  destino: { id: number; nombre: string } | null;
  camion: Camion | null;
  usuario: { nombre: string } | null;
  lineas: LineaDespacho[];
  resumen: { pesoTotalKg: number; pesoEmpacadoKg: number; capacidadKg: number | null; lineasSinPeso: number };
};

export const NOMBRE_ESTADO: Record<EstadoDespacho, string> = {
  ABIERTO: "Empacando",
  EMPACADO: "Listo para despachar",
  DESPACHADO: "Despachado",
  CANCELADO: "Cancelado",
};

// Igual que en el servidor: "tra 2394", "2394" o "TRA2394" → "TRA-2394"
export function normalizarTra(valor: string): string {
  const limpio = valor.trim().toUpperCase().replace(/\s+/g, "");
  const numero = limpio.match(/^(?:TRA)?-?(\d+)$/);
  return numero ? `TRA-${numero[1]}` : limpio;
}

export function useDespachos() {
  return useQuery({ queryKey: ["despachos", "lista"], queryFn: () => api<Despacho[]>("/api/despachos") });
}

export function useDespacho(documento: string | undefined) {
  return useQuery({
    queryKey: ["despachos", "documento", documento],
    queryFn: () => api<Despacho>(`/api/despachos/documento/${encodeURIComponent(documento!)}`),
    enabled: !!documento,
  });
}

// Todas las acciones devuelven el despacho actualizado: se guarda directo en la caché
function useAccionDespacho<V>(accion: (variables: V) => Promise<Despacho>, moverStock = false) {
  const queryClient = useQueryClient();
  const invalidarStock = useInvalidarStock();
  return useMutation({
    mutationFn: accion,
    onSuccess: (despacho) => {
      queryClient.setQueryData(["despachos", "documento", despacho.documento], despacho);
      void queryClient.invalidateQueries({ queryKey: ["despachos", "lista"] });
      if (moverStock) void invalidarStock();
    },
  });
}

export const useCrearDespacho = () =>
  useAccionDespacho((datos: Record<string, unknown>) => api<Despacho>("/api/despachos", { method: "POST", body: datos }));

export const useEmpacarLinea = () =>
  useAccionDespacho(({ despachoId, lineaId, cantidadEmpacada }: { despachoId: number; lineaId: number; cantidadEmpacada: number }) =>
    api<Despacho>(`/api/despachos/${despachoId}/lineas/${lineaId}`, { method: "PUT", body: { cantidadEmpacada } }),
  );

export const useCambiarCamion = () =>
  useAccionDespacho(({ despachoId, camionId }: { despachoId: number; camionId: number }) =>
    api<Despacho>(`/api/despachos/${despachoId}`, { method: "PATCH", body: { camionId } }),
  );

export const useDespachar = () =>
  useAccionDespacho((despachoId: number) => api<Despacho>(`/api/despachos/${despachoId}/despachar`, { method: "POST" }), true);

export const useCancelarDespacho = () =>
  useAccionDespacho((despachoId: number) => api<Despacho>(`/api/despachos/${despachoId}/cancelar`, { method: "POST" }));
