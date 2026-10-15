import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// Así llega un producto desde la API. pesoKg es Decimal en PostgreSQL:
// viene como texto ("22.68") para no perder precisión; se convierte con Number() al mostrarlo.
export type Producto = {
  id: number;
  codigo: string;
  nombre: string;
  unidad: string;
  pesoKg: string | null;
  activo: boolean;
  creadoEn: string;
  actualizadoEn: string;
};

export type ProductoInput = {
  codigo: string;
  nombre: string;
  unidad: string;
  pesoKg: number | null;
};

type Filtros = { buscar: string; incluirInactivos: boolean };

// La "llave" identifica los datos en la caché de TanStack Query.
// Cambia el filtro → cambia la llave → se hace una consulta nueva.
const productosKey = ["productos"] as const;

export function useProductos({ buscar, incluirInactivos }: Filtros) {
  const params = new URLSearchParams();
  if (buscar.trim()) params.set("buscar", buscar.trim());
  if (incluirInactivos) params.set("incluirInactivos", "true");
  const query = params.toString();

  return useQuery({
    queryKey: [...productosKey, { buscar, incluirInactivos }],
    queryFn: () => api<Producto[]>(`/api/productos${query ? `?${query}` : ""}`),
    // Mientras llega el resultado de la nueva búsqueda, se sigue mostrando la tabla anterior
    placeholderData: keepPreviousData,
  });
}

// Después de crear/editar/desactivar, se invalida la lista para que se vuelva a pedir
function useInvalidarProductos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: productosKey });
}

export function useCrearProducto() {
  const invalidar = useInvalidarProductos();
  return useMutation({
    mutationFn: (datos: ProductoInput) =>
      api<Producto>("/api/productos", { method: "POST", body: datos }),
    onSuccess: invalidar,
  });
}

export function useActualizarProducto() {
  const invalidar = useInvalidarProductos();
  return useMutation({
    mutationFn: ({ id, datos }: { id: number; datos: Partial<ProductoInput> & { activo?: boolean } }) =>
      api<Producto>(`/api/productos/${id}`, { method: "PATCH", body: datos }),
    onSuccess: invalidar,
  });
}

export function useDesactivarProducto() {
  const invalidar = useInvalidarProductos();
  return useMutation({
    mutationFn: (id: number) => api<Producto>(`/api/productos/${id}`, { method: "DELETE" }),
    onSuccess: invalidar,
  });
}
