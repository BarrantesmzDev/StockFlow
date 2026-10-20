import { createContext, useContext } from "react";
import type { Rol, Usuario } from "./auth.api";

export type EstadoAuth = "cargando" | "configurar" | "anonimo" | "autenticado";

export type AuthContexto = {
  estado: EstadoAuth;
  usuario: Usuario | null;
  iniciarSesion: (email: string, password: string) => Promise<void>;
  configurar: (nombre: string, email: string, password: string) => Promise<void>;
  cerrarSesion: () => Promise<void>;
  // ¿El usuario actual tiene alguno de estos roles?
  puede: (...roles: Rol[]) => boolean;
};

export const AuthContext = createContext<AuthContexto | null>(null);

export function useAuth(): AuthContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return contexto;
}
