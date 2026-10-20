import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Columna } from "./hojas";

const NINGUNA = "ninguna";

// Elegir qué columna del Excel corresponde a un dato. undefined = no se usa.
export function ColumnaSelect({
  id,
  columnas,
  value,
  onChange,
  permitirNinguna = true,
  textoNinguna = "— No importar —",
  invalido,
}: {
  id?: string;
  columnas: Columna[];
  value: number | undefined;
  onChange: (indice: number | undefined) => void;
  permitirNinguna?: boolean;
  textoNinguna?: string;
  invalido?: boolean;
}) {
  return (
    <Select
      value={value === undefined ? (permitirNinguna ? NINGUNA : "") : String(value)}
      onValueChange={(v) => onChange(v === NINGUNA ? undefined : Number(v))}
    >
      <SelectTrigger id={id} className="w-full" aria-invalid={invalido}>
        <SelectValue placeholder="Elige una columna" />
      </SelectTrigger>
      <SelectContent>
        {permitirNinguna && <SelectItem value={NINGUNA}>{textoNinguna}</SelectItem>}
        {columnas.map((c) => (
          <SelectItem key={c.indice} value={String(c.indice)}>
            {c.etiqueta}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
