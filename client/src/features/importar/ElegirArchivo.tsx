import { useRef } from "react";
import { FileSpreadsheetIcon, Loader2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";

// Botón para elegir un .xlsx o .csv (el input de archivo real queda escondido)
export function ElegirArchivo({
  onElegir,
  cargando,
  nombreActual,
}: {
  onElegir: (archivo: File) => void;
  cargando?: boolean;
  nombreActual?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap items-center gap-3">
      <input
        ref={input}
        type="file"
        accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) onElegir(archivo);
          e.target.value = ""; // permite elegir el mismo archivo otra vez
        }}
      />
      <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={cargando}>
        {cargando ? <Loader2Icon className="animate-spin" /> : <FileSpreadsheetIcon />}
        {cargando ? "Leyendo…" : nombreActual ? "Elegir otro archivo" : "Elegir archivo .xlsx o .csv"}
      </Button>
      {nombreActual && <span className="text-sm text-muted-foreground">{nombreActual}</span>}
    </div>
  );
}
