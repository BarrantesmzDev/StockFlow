import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useInvalidarStock } from "@/features/inventario/inventario.api";

export type TipoMovimiento = "ENTRADA" | "VENTA" | "DEVOLUCION" | "TRASLADO" | "AJUSTE";

export type Movimiento = {
  id: number;
  tipo: TipoMovimiento;
  cantidad: string;
  fecha: string;
  documento: string | null;
  factura: string | null;
  notaCredito: string | null;
  cliente: string | null;
  serie: string | null;
  codigoGarantia: string | null; // EP
  notas: string | null;
  producto: { codigo: string; nombre: string; unidad: string };
  origen: { nombre: string } | null;
  destino: { nombre: string } | null;
  usuario: { nombre: string } | null;
};

export const NOMBRE_TIPO: Record<TipoMovimiento, string> = {
  ENTRADA: "Entrada",
  VENTA: "Venta",
  DEVOLUCION: "Devolución",
  TRASLADO: "Traslado",
  AJUSTE: "Ajuste",
};

export const COLOR_TIPO: Record<TipoMovimiento, string> = {
  ENTRADA: "border-emerald-200 bg-emerald-50 text-emerald-800",
  VENTA: "border-sky-200 bg-sky-50 text-sky-800",
  DEVOLUCION: "border-amber-200 bg-amber-50 text-amber-800",
  TRASLADO: "border-violet-200 bg-violet-50 text-violet-800",
  AJUSTE: "border-zinc-200 bg-zinc-50 text-zinc-700",
};

export type FiltrosMovimientos = {
  tipo?: TipoMovimiento;
  ubicacionId?: number;
  buscar: string;
  desde?: string; // "2026-10-01"
  hasta?: string;
  pagina: number;
};

const TAMANO = 50;

export function useMovimientos(filtros: FiltrosMovimientos) {
  const params = new URLSearchParams({ pagina: String(filtros.pagina), tamano: String(TAMANO) });
  if (filtros.tipo) params.set("tipo", filtros.tipo);
  if (filtros.ubicacionId) params.set("ubicacionId", String(filtros.ubicacionId));
  if (filtros.buscar.trim()) params.set("buscar", filtros.buscar.trim());
  // Fechas en hora local: "desde" al inicio del día, "hasta" al final
  if (filtros.desde) params.set("desde", new Date(`${filtros.desde}T00:00:00`).toISOString());
  if (filtros.hasta) params.set("hasta", new Date(`${filtros.hasta}T23:59:59.999`).toISOString());
  return useQuery({
    queryKey: ["movimientos", filtros],
    queryFn: () =>
      api<{ items: Movimiento[]; total: number; pagina: number; tamano: number }>(`/api/movimientos?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useRegistrarMovimiento() {
  const invalidar = useInvalidarStock();
  return useMutation({
    mutationFn: (datos: Record<string, unknown>) =>
      api<{ registrados: number; ids: number[] }>("/api/movimientos", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}
