// Error con código HTTP. El service lo lanza (ej. 404, 409) y el error handler
// lo convierte en la respuesta JSON con ese status.
export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpError";
    this.status = status;
  }
}
