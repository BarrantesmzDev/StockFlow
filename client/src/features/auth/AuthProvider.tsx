import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { EVENTO_SESION_VENCIDA, guardarToken, leerToken } from "@/lib/api";
import { authApi, type Rol, type Usuario } from "./auth.api";
import { AuthContext, type EstadoAuth } from "./auth-context";

// Al abrir la app: si hay token guardado se valida con /auth/yo; si no, se pregunta si la
// instalación es nueva (para mostrar "crear administrador" en vez del login).
export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [estado, setEstado] = useState<EstadoAuth>("cargando");
  const [usuario, setUsuario] = useState<Usuario | null>(null);

  const quedarAnonimo = useCallback(async () => {
    setUsuario(null);
    queryClient.clear(); // los datos del usuario anterior no deben quedar en caché
    try {
      const { necesitaConfiguracion } = await authApi.estado();
      setEstado(necesitaConfiguracion ? "configurar" : "anonimo");
    } catch {
      setEstado("anonimo");
    }
  }, [queryClient]);

  useEffect(() => {
    if (!leerToken()) {
      void quedarAnonimo();
      return;
    }
    authApi
      .yo()
      .then((u) => {
        setUsuario(u);
        setEstado("autenticado");
      })
      .catch(() => void quedarAnonimo());
  }, [quedarAnonimo]);

  // Si cualquier llamada recibe 401, se vuelve al login
  useEffect(() => {
    const alVencer = () => void quedarAnonimo();
    window.addEventListener(EVENTO_SESION_VENCIDA, alVencer);
    return () => window.removeEventListener(EVENTO_SESION_VENCIDA, alVencer);
  }, [quedarAnonimo]);

  const valor = useMemo(
    () => ({
      estado,
      usuario,
      iniciarSesion: async (email: string, password: string) => {
        const respuesta = await authApi.login({ email, password });
        guardarToken(respuesta.token);
        setUsuario(respuesta.usuario);
        setEstado("autenticado");
      },
      configurar: async (nombre: string, email: string, password: string) => {
        const respuesta = await authApi.configurar({ nombre, email, password });
        guardarToken(respuesta.token);
        setUsuario(respuesta.usuario);
        setEstado("autenticado");
      },
      cerrarSesion: async () => {
        await authApi.logout().catch(() => undefined);
        guardarToken(null);
        await quedarAnonimo();
      },
      puede: (...roles: Rol[]) => usuario !== null && roles.includes(usuario.rol),
    }),
    [estado, usuario, quedarAnonimo],
  );

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>;
}
