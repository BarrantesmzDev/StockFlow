import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Rol } from "@/features/auth/auth.api";

export type UsuarioAdmin = {
  id: number;
  nombre: string;
  email: string;
  rol: Rol;
  activo: boolean;
  creadoEn: string;
  ultimoAccesoEn: string | null;
};

export function useUsuarios() {
  return useQuery({ queryKey: ["usuarios"], queryFn: () => api<UsuarioAdmin[]>("/api/usuarios") });
}

export function useGuardarUsuario() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...datos }: { id?: number; nombre?: string; email?: string; password?: string; rol?: Rol; activo?: boolean }) =>
      id
        ? api<UsuarioAdmin>(`/api/usuarios/${id}`, { method: "PATCH", body: datos })
        : api<UsuarioAdmin>("/api/usuarios", { method: "POST", body: datos }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["usuarios"] }),
  });
}
