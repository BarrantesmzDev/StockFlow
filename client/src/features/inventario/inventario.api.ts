import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Ubicacion } from "@/features/catalogos/catalogos.api";
import type { Celda } from "@/features/importar/hojas";

export type FilaInventario = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  pesoKg: string | null;
  activo: boolean;
  stock: Record<number, number>; // ubicacionId → cantidad
  total: number;
  sistemaCr: number | null; // null = el producto no viene en la exportación de SistemaCR
  diferencia: number | null; // stock en bodega principal − SistemaCR
};

export type Inventario = {
  ubicaciones: Ubicacion[];
  principalId: number;
  sistemaCrImportadoEn: string | null;
  filas: FilaInventario[];
  sinProducto: { codigo: string; nombre: string | null; cantidad: number }[];
  resumen: { productos: number; conDiferencia: number };
};

export type FiltrosInventario = {
  buscar: string;
  soloDiferencias: boolean;
  soloConStock: boolean;
  incluirInactivos: boolean;
};

export function useInventario(filtros: FiltrosInventario) {
  const params = new URLSearchParams();
  if (filtros.buscar.trim()) params.set("buscar", filtros.buscar.trim());
  if (filtros.soloDiferencias) params.set("soloDiferencias", "true");
  if (filtros.soloConStock) params.set("soloConStock", "true");
  if (filtros.incluirInactivos) params.set("incluirInactivos", "true");
  return useQuery({
    queryKey: ["inventario", filtros],
    queryFn: () => api<Inventario>(`/api/inventario?${params}`),
    placeholderData: keepPreviousData,
  });
}

export function useImportarSistemaCr() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (datos: {
      filaInicio: number;
      filas: Celda[][];
      columnas: { codigo: number; cantidad: number; nombre?: number };
    }) =>
      api<{ importados: number; duplicados: number; errores: string[] }>("/api/inventario/sistema-cr", {
        method: "POST",
        body: datos,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inventario"] }),
  });
}

// Cualquier cambio de stock (movimiento, apartado, despacho, importación) debe refrescar estas vistas
export function useInvalidarStock() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      ["inventario", "movimientos", "apartados", "despachos"].map((clave) =>
        queryClient.invalidateQueries({ queryKey: [clave] }),
      ),
    );
}
