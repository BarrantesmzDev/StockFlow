import { z } from "zod";

// Mensajes de error de Zod en español para toda la app.
// Los schemas importan "z" desde aquí (no directo de "zod") para que esto siempre se aplique.
z.config(z.locales.es());

export { z };
