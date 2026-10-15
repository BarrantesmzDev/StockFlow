// Cliente HTTP para hablar con la API de StockFlow.
// En desarrollo VITE_API_URL queda vacío: el frontend llama a "/api/..." y Vite lo
// reenvía a Express (ver proxy en vite.config.ts). En producción apunta a la URL de la API.
const API_URL = import.meta.env.VITE_API_URL ?? "";

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

type Opciones = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

export async function api<T>(ruta: string, { method = "GET", body }: Opciones = {}): Promise<T> {
  let respuesta: Response;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method,
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "No se pudo conectar con la API. ¿Está corriendo el servidor?");
  }

  const datos = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    const mensaje =
      datos?.error ??
      (respuesta.status >= 500
        ? "No se pudo conectar con la API. ¿Está corriendo el servidor?"
        : `Error ${respuesta.status}`);
    throw new ApiError(respuesta.status, mensaje, datos?.detalles ?? []);
  }

  return datos as T;
}
