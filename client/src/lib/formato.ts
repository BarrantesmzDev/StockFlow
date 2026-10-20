// Formatos de Costa Rica: coma decimal y punto de miles ("1.110,65")
const numero = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 2 });
const kilos = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 1 });
const fecha = new Intl.DateTimeFormat("es-CR", { day: "2-digit", month: "short", year: "numeric" });
const fechaHora = new Intl.DateTimeFormat("es-CR", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

// La API manda los Decimal como texto ("22.68"): se aceptan los dos
export const formatoNumero = (valor: number | string | null | undefined) =>
  valor === null || valor === undefined ? "—" : numero.format(Number(valor));

export const formatoKg = (valor: number | string | null | undefined) =>
  valor === null || valor === undefined ? "—" : `${kilos.format(Number(valor))} kg`;

export const formatoFecha = (valor: string | Date | null | undefined) =>
  valor ? fecha.format(new Date(valor)) : "—";

export const formatoFechaHora = (valor: string | Date | null | undefined) =>
  valor ? fechaHora.format(new Date(valor)) : "—";

// "2026-10-20" para <input type="date"> (en hora local, no UTC)
export function hoyISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
