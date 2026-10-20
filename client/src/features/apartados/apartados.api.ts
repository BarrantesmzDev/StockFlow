import { keepPreviousData, useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useInvalidarStock } from "@/features/inventario/inventario.api";

export type EstadoApartado = "ACTIVO" | "ENTREGADO" | "CANCELADO";

export type Apartado = {
  id: number;
  cliente: string;
  telefono: string | null;
  cantidad: string;
  estado: EstadoApartado;
  factura: string | null;
  notas: string | null;
  creadoEn: string;
  cerradoEn: string | null;
  producto: { codigo: string; nombre: string; unidad: string };
  origen: { nombre: string };
  usuario: { nombre: string } | null;
};

export function useApartados(estado: EstadoApartado, buscar: string) {
  const params = new URLSearchParams({ estado });
  if (buscar.trim()) params.set("buscar", buscar.trim());
  return useQuery({
    queryKey: ["apartados", estado, buscar],
    queryFn: () => api<Apartado[]>(`/api/apartados?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useCrearApartado() {
  const invalidar = useInvalidarStock();
  return useMutation({
    mutationFn: (datos: Record<string, unknown>) => api<Apartado[]>("/api/apartados", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}

export function useEntregarApartado() {
  const invalidar = useInvalidarStock();
  return useMutation({
    mutationFn: ({ id, ...datos }: { id: number; factura: string; serie?: string; codigoGarantia?: string }) =>
      api<Apartado>(`/api/apartados/${id}/entregar`, { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}

export function useCancelarApartado() {
  const invalidar = useInvalidarStock();
  return useMutation({
    mutationFn: ({ id, notas }: { id: number; notas?: string }) =>
      api<Apartado>(`/api/apartados/${id}/cancelar`, { method: "POST", body: { notas } }),
    onSuccess: invalidar,
  });
}
