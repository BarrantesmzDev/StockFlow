import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Campo } from "@/components/Campo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ColumnaSelect } from "@/features/importar/ColumnaSelect";
import { ElegirArchivo } from "@/features/importar/ElegirArchivo";
import {
  buscarColumna,
  columnasDe,
  detectarFilaEncabezado,
  useLeerArchivo,
  type Hoja,
} from "@/features/importar/hojas";
import { useImportarSistemaCr } from "./inventario.api";

// Sube la exportación de SistemaCR (código + cantidad) para calcular las diferencias
export function CargarSistemaCrDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Cargar exportación de SistemaCR</DialogTitle>
          <DialogDescription>
            Reemplaza la carga anterior. La diferencia se calcula contra la bodega principal.
          </DialogDescription>
        </DialogHeader>
        <Formulario onListo={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ onListo }: { onListo: () => void }) {
  const leer = useLeerArchivo();
  const importar = useImportarSistemaCr();
  const [archivo, setArchivo] = useState<string>();
  const [hojas, setHojas] = useState<Hoja[]>([]);
  const [hojaNombre, setHojaNombre] = useState<string>();
  const [filaEncabezado, setFilaEncabezado] = useState(1);
  const [codigo, setCodigo] = useState<number>();
  const [cantidad, setCantidad] = useState<number>();
  const [nombre, setNombre] = useState<number>();

  const hoja = hojas.find((h) => h.nombre === hojaNombre);
  const columnas = useMemo(() => (hoja ? columnasDe(hoja.filas, filaEncabezado) : []), [hoja, filaEncabezado]);

  // Al elegir hoja o fila de encabezados se adivinan las columnas por su título
  function elegirHoja(h: Hoja, fila = detectarFilaEncabezado(h.filas)) {
    setHojaNombre(h.nombre);
    setFilaEncabezado(fila);
    const cols = columnasDe(h.filas, fila);
    setCodigo(buscarColumna(cols, /^c[oó]digo$/i, /c[oó]d/i));
    setCantidad(buscarColumna(cols, /^cantidad$/i, /existencia|stock|cant/i));
    setNombre(buscarColumna(cols, /^producto$/i, /nombre|descrip|art[ií]culo|producto/i));
  }

  function alElegirArchivo(file: File) {
    setArchivo(file.name);
    leer.mutate(file, {
      onSuccess: ({ hojas }) => {
        setHojas(hojas);
        // Si hay una hoja "sistema" (como en el Excel actual) se elige sola
        elegirHoja(hojas.find((h) => /sistema/i.test(h.nombre)) ?? hojas[0]);
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function cargar() {
    if (!hoja || codigo === undefined || cantidad === undefined) return;
    importar.mutate(
      { filaInicio: filaEncabezado + 1, filas: hoja.filas.slice(filaEncabezado), columnas: { codigo, cantidad, nombre } },
      {
        onSuccess: (r) => {
          toast.success(`SistemaCR cargado: ${r.importados} códigos`);
          if (r.errores.length) toast.warning(`${r.errores.length} filas con error`, { description: r.errores.slice(0, 3).join("\n") });
          onListo();
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <div className="grid gap-4">
      <ElegirArchivo onElegir={alElegirArchivo} cargando={leer.isPending} nombreActual={archivo} />
      {hoja && (
        <>
          <div className="grid grid-cols-[1fr_auto] gap-3">
            <Campo label="Hoja">
              <Select value={hojaNombre} onValueChange={(v) => elegirHoja(hojas.find((h) => h.nombre === v)!)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {hojas.map((h) => (
                    <SelectItem key={h.nombre} value={h.nombre}>
                      {h.nombre} ({h.filas.length} filas)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Campo>
            <Campo label="Fila de títulos">
              <Input
                type="number"
                min={1}
                className="w-24"
                value={filaEncabezado}
                onChange={(e) => elegirHoja(hoja, Math.max(1, Number(e.target.value) || 1))}
              />
            </Campo>
          </div>
          <Campo label="Columna del código *">
            <ColumnaSelect columnas={columnas} value={codigo} onChange={setCodigo} permitirNinguna={false} />
          </Campo>
          <Campo label="Columna de la cantidad *">
            <ColumnaSelect columnas={columnas} value={cantidad} onChange={setCantidad} permitirNinguna={false} />
          </Campo>
          <Campo label="Columna del nombre (opcional)">
            <ColumnaSelect columnas={columnas} value={nombre} onChange={setNombre} />
          </Campo>
        </>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button onClick={cargar} disabled={!hoja || codigo === undefined || cantidad === undefined || importar.isPending}>
          {importar.isPending ? "Cargando…" : "Cargar"}
        </Button>
      </DialogFooter>
    </div>
  );
}
