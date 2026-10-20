import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export type TipoUbicacion = "BODEGA" | "SUCURSAL" | "APARTADOS";
export type Ubicacion = { id: number; nombre: string; tipo: TipoUbicacion; activa: boolean };
export type Camion = { id: number; nombre: string; placa: string | null; capacidadKg: string; activo: boolean };

// Cambian muy poco: se guardan en caché 10 minutos
export function useUbicaciones() {
  return useQuery({
    queryKey: ["ubicaciones"],
    queryFn: () => api<Ubicacion[]>("/api/ubicaciones"),
    staleTime: 10 * 60_000,
  });
}

export function useCamiones() {
  return useQuery({
    queryKey: ["camiones"],
    queryFn: () => api<Camion[]>("/api/camiones"),
    staleTime: 10 * 60_000,
  });
}
