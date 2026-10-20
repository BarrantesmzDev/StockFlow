import { PlusIcon, Trash2Icon } from "lucide-react";
import { ProductoPicker } from "@/components/ProductoPicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Producto } from "@/features/productos/productos.api";

export type LineaForm = {
  clave: number; // para el key de React (el índice cambia al borrar)
  producto: Producto | null;
  cantidad: string; // texto del input: acepta "4,5"
  serie: string;
  codigoGarantia: string; // EP
};

let siguienteClave = 1;
export const lineaVacia = (): LineaForm => ({
  clave: siguienteClave++,
  producto: null,
  cantidad: "",
  serie: "",
  codigoGarantia: "",
});

// "4,5" → 4.5. Si no es número devuelve null (la API responde con el error del campo).
export function aNumero(texto: string): number | null {
  const n = Number(texto.trim().replace(",", "."));
  return texto.trim() === "" || Number.isNaN(n) ? null : n;
}

type Props = {
  lineas: LineaForm[];
  onChange: (lineas: LineaForm[]) => void;
  conSerie?: boolean; // mostrar Serie y EP (ventas, entradas, devoluciones)
  etiquetaCantidad?: string;
  errores?: Record<string, string>; // "lineas.0.cantidad" → mensaje (formato de la API)
};

export function LineasProductos({ lineas, onChange, conSerie = false, etiquetaCantidad = "Cantidad", errores = {} }: Props) {
  const cambiar = (clave: number, cambios: Partial<LineaForm>) =>
    onChange(lineas.map((l) => (l.clave === clave ? { ...l, ...cambios } : l)));

  return (
    // min-w-0: sin esto, un nombre de producto largo ensancha todo el formulario (grid)
    <div className="grid min-w-0 gap-2">
      <div className="hidden gap-2 text-xs font-medium text-muted-foreground sm:flex">
        <span className="flex-1">Producto</span>
        <span className="w-24">{etiquetaCantidad}</span>
        {conSerie && <span className="w-28">Serie</span>}
        {conSerie && <span className="w-28">EP (garantía)</span>}
        <span className="w-8" />
      </div>
      {lineas.map((linea, i) => {
        const error = Object.entries(errores).find(([campo]) => campo.startsWith(`lineas.${i}.`))?.[1];
        return (
          <div key={linea.clave} className="grid min-w-0 gap-1">
            <div className="flex min-w-0 flex-wrap items-center gap-2 sm:flex-nowrap">
              <div className="w-full min-w-0 sm:flex-1">
                <ProductoPicker value={linea.producto} onChange={(producto) => cambiar(linea.clave, { producto })} invalido={!!error && !linea.producto} />
              </div>
              <Input
                className="w-24"
                inputMode="decimal"
                placeholder={etiquetaCantidad}
                aria-label={etiquetaCantidad}
                value={linea.cantidad}
                onChange={(e) => cambiar(linea.clave, { cantidad: e.target.value })}
              />
              {conSerie && (
                <>
                  <Input
                    className="w-28"
                    placeholder="Serie"
                    aria-label="Número de serie"
                    value={linea.serie}
                    onChange={(e) => cambiar(linea.clave, { serie: e.target.value })}
                  />
                  <Input
                    className="w-28"
                    placeholder="EP"
                    aria-label="Código de garantía (EP)"
                    value={linea.codigoGarantia}
                    onChange={(e) => cambiar(linea.clave, { codigoGarantia: e.target.value })}
                  />
                </>
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Quitar línea"
                disabled={lineas.length === 1}
                onClick={() => onChange(lineas.filter((l) => l.clave !== linea.clave))}
              >
                <Trash2Icon />
              </Button>
            </div>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        );
      })}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...lineas, lineaVacia()])}>
          <PlusIcon />
          Agregar producto
        </Button>
      </div>
      {errores.lineas && <p className="text-xs text-destructive">{errores.lineas}</p>}
    </div>
  );
}
