import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Paginacion({
  pagina,
  tamano,
  total,
  onCambiar,
}: {
  pagina: number;
  tamano: number;
  total: number;
  onCambiar: (pagina: number) => void;
}) {
  const paginas = Math.max(1, Math.ceil(total / tamano));
  const desde = total === 0 ? 0 : (pagina - 1) * tamano + 1;
  const hasta = Math.min(pagina * tamano, total);
  return (
    <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
      <span>
        {desde}–{hasta} de {total}
      </span>
      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon-sm" disabled={pagina <= 1} onClick={() => onCambiar(pagina - 1)} aria-label="Página anterior">
          <ChevronLeftIcon />
        </Button>
        <span className="px-2">
          {pagina} / {paginas}
        </span>
        <Button variant="outline" size="icon-sm" disabled={pagina >= paginas} onClick={() => onCambiar(pagina + 1)} aria-label="Página siguiente">
          <ChevronRightIcon />
        </Button>
      </div>
    </div>
  );
}
