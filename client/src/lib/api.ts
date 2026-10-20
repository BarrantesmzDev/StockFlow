// Cliente HTTP para hablar con la API de StockFlow.
// En desarrollo VITE_API_URL queda vacío: el frontend llama a "/api/..." y Vite lo
// reenvía a Express (ver proxy en vite.config.ts). En producción apunta a la URL de la API.
const API_URL = import.meta.env.VITE_API_URL ?? "";

const CLAVE_TOKEN = "stockflow.token";

// El token de sesión se guarda en el navegador para no pedir login en cada visita.
// try/catch: en modo privado o con almacenamiento bloqueado, localStorage puede fallar.
export function leerToken(): string | null {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
}

export function guardarToken(token: string | null) {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    // sin almacenamiento: la sesión dura hasta recargar la página
  }
}

// Avisa a la app cuando la API dice 401 (sesión vencida o usuario desactivado)
export const EVENTO_SESION_VENCIDA = "stockflow:sesion-vencida";

export type DetalleError = { campo: string; mensaje: string };

// Error con el mismo formato que devuelve el error handler del backend
export class ApiError extends Error {
  readonly status: number;
  readonly detalles: DetalleError[];

  constructor(status: number, message: string, detalles: DetalleError[] = []) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.detalles = detalles;
  }
}

type Opciones = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  archivo?: Blob; // se manda tal cual (application/octet-stream)
};

export async function api<T>(ruta: string, { method = "GET", body, archivo }: Opciones = {}): Promise<T> {
  const headers: Record<string, string> = {};
  const token = leerToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";
  if (archivo) headers["Content-Type"] = "application/octet-stream";

  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: archivo ? "POST" : method,
      headers,
      body: archivo ?? (body !== undefined ? JSON.stringify(body) : undefined),
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con la API. Revisa tu conexión o intenta en un momento.");
  }

  const datos = respuesta.status === 204 ? null : await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    if (respuesta.status === 401 && token) {
      guardarToken(null);
      window.dispatchEvent(new Event(EVENTO_SESION_VENCIDA));
    }
    const mensaje =
      datos?.error ??
      (respuesta.status >= 500
        ? "El servidor no respondió bien. Si acaba de despertar, intenta de nuevo en unos segundos."
        : `Error ${respuesta.status}`);
    throw new ApiError(respuesta.status, mensaje, datos?.detalles ?? []);
  }

  return datos as T;
}

// Convierte los detalles de un 400 en { campo: mensaje } para mostrarlos debajo de cada input
export function erroresPorCampo(error: unknown): Record<string, string> {
  if (!(error instanceof ApiError)) return {};
  return Object.fromEntries(error.detalles.map((d) => [d.campo, d.mensaje]));
}
