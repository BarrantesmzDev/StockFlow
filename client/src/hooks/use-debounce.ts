import { useEffect, useState } from "react";

// Devuelve el valor solo cuando deja de cambiar por `ms` milisegundos.
// Sirve para no mandar una consulta a la API por cada tecla del buscador.
export function useDebounce<T>(valor: T, ms = 300): T {
  const [valorDebounced, setValorDebounced] = useState(valor);

  useEffect(() => {
    const timer = setTimeout(() => setValorDebounced(valor), ms);
    return () => clearTimeout(timer);
  }, [valor, ms]);

  return valorDebounced;
}
