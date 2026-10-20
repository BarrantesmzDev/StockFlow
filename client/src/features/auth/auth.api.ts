import { api } from "@/lib/api";

export type Rol = "ADMIN" | "OPERADOR" | "CONSULTA";

export type Usuario = { id: number; nombre: string; email: string; rol: Rol };

type RespuestaSesion = { token: string; usuario: Usuario };

export const authApi = {
  estado: () => api<{ necesitaConfiguracion: boolean }>("/api/auth/estado"),
  yo: () => api<Usuario>("/api/auth/yo"),
  login: (datos: { email: string; password: string }) =>
    api<RespuestaSesion>("/api/auth/login", { method: "POST", body: datos }),
  configurar: (datos: { nombre: string; email: string; password: string }) =>
    api<RespuestaSesion>("/api/auth/configurar", { method: "POST", body: datos }),
  logout: () => api<null>("/api/auth/logout", { method: "POST" }),
};

export const NOMBRE_ROL: Record<Rol, string> = {
  ADMIN: "Administrador",
  OPERADOR: "Operador",
  CONSULTA: "Consulta",
};
