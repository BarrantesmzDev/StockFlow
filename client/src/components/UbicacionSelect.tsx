import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUbicaciones, type TipoUbicacion } from "@/features/catalogos/catalogos.api";

type Props = {
  id?: string;
  value: number | null;
  onChange: (id: number) => void;
  placeholder?: string;
  excluirTipos?: TipoUbicacion[]; // ej. no ofrecer "Apartados" en un movimiento normal
  excluirId?: number | null; // ej. el origen no puede ser también el destino
  invalido?: boolean;
};

export function UbicacionSelect({
  id,
  value,
  onChange,
  placeholder = "Elige una ubicación",
  excluirTipos = [],
  excluirId,
  invalido,
}: Props) {
  const { data: ubicaciones = [] } = useUbicaciones();
  const opciones = ubicaciones.filter((u) => !excluirTipos.includes(u.tipo) && u.id !== excluirId);

  return (
    <Select value={value ? String(value) : ""} onValueChange={(v) => onChange(Number(v))}>
      <SelectTrigger id={id} className="w-full" aria-invalid={invalido}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {opciones.map((u) => (
          <SelectItem key={u.id} value={String(u.id)}>
            {u.nombre}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
