import { useState, type ReactNode } from "react";
import { DownloadIcon, SearchIcon, UploadIcon } from "lucide-react";
import { Encabezado } from "@/components/Encabezado";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { useDebounce } from "@/hooks/use-debounce";
import { formatoFechaHora, formatoNumero } from "@/lib/formato";
import { CargarSistemaCrDialog } from "./CargarSistemaCrDialog";
import { useInventario, type Inventario } from "./inventario.api";

// Reemplaza la hoja INVENTARIO: stock por ubicación y diferencia contra SistemaCR
export function InventarioPage() {
  const { puede } = useAuth();
  const [buscar, setBuscar] = useState("");
  const [soloDiferencias, setSoloDiferencias] = useState(false);
  const [soloConStock, setSoloConStock] = useState(false);
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const [cargandoSistema, setCargandoSistema] = useState(false);
  const buscarDebounced = useDebounce(buscar);

  const { data, isPending, isError, error, isFetching, refetch } = useInventario({
    buscar: buscarDebounced,
    soloDiferencias,
    soloConStock,
    incluirInactivos,
  });

  return (
    <section className="flex flex-col gap-4">
      <Encabezado
        titulo="Inventario"
        descripcion={
          data?.sistemaCrImportadoEn
            ? `SistemaCR cargado el ${formatoFechaHora(data.sistemaCrImportadoEn)} · ${data.resumen.conDiferencia} productos con diferencia`
            : "Carga la exportación de SistemaCR para ver las diferencias."
        }
      >
        {data && (
          <Button variant="outline" onClick={() => descargarCsv(data)}>
            <DownloadIcon />
            Descargar CSV
          </Button>
        )}
        {puede("ADMIN") && (
          <Button onClick={() => setCargandoSistema(true)}>
            <UploadIcon />
            Cargar SistemaCR
          </Button>
        )}
      </Encabezado>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por código o nombre…"
            className="pl-8"
            aria-label="Buscar en el inventario"
          />
        </div>
        <Casilla texto="Solo con diferencia" valor={soloDiferencias} onChange={setSoloDiferencias} />
        <Casilla texto="Solo con stock" valor={soloConStock} onChange={setSoloConStock} />
        <Casilla texto="Incluir inactivos" valor={incluirInactivos} onChange={setIncluirInactivos} />
        {isFetching && !isPending && <span className="text-xs text-muted-foreground">Actualizando…</span>}
      </div>

      {data && data.sinProducto.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>{data.sinProducto.length} códigos de SistemaCR no existen en StockFlow:</strong>{" "}
          {data.sinProducto.map((s) => `${s.codigo} (${formatoNumero(s.cantidad)})`).join(", ")}. Créalos en
          Productos o revisa si el código está escrito distinto.
        </div>
      )}

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Código</TableHead>
              <TableHead className="min-w-56">Producto</TableHead>
              {data?.ubicaciones.map((u) => (
                <TableHead key={u.id} className="text-right">
                  {u.nombre}
                </TableHead>
              ))}
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">SistemaCR</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <FilaMensaje columnas={6}>Cargando inventario…</FilaMensaje>
            ) : isError ? (
              <FilaMensaje columnas={6}>
                <span className="text-destructive">{error.message}</span>{" "}
                <Button variant="link" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </FilaMensaje>
            ) : data.filas.length === 0 ? (
              <FilaMensaje columnas={data.ubicaciones.length + 5}>
                {buscarDebounced || soloDiferencias || soloConStock
                  ? "Ningún producto cumple el filtro."
                  : "Todavía no hay productos. Impórtalos desde Excel en «Importar»."}
              </FilaMensaje>
            ) : (
              data.filas.map((fila) => (
                <TableRow key={fila.id} className={fila.activo ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{fila.codigo}</TableCell>
                  <TableCell className="whitespace-normal">
                    {fila.nombre}
                    <span className="ml-1 text-xs text-muted-foreground">{fila.unidad}</span>
                  </TableCell>
                  {data.ubicaciones.map((u) => (
                    <TableCell
                      key={u.id}
                      className={`text-right tabular-nums ${fila.stock[u.id] === 0 ? "text-muted-foreground/60" : ""} ${
                        u.id === data.principalId ? "font-medium" : ""
                      }`}
                    >
                      {formatoNumero(fila.stock[u.id])}
                    </TableCell>
                  ))}
                  <TableCell className="text-right font-medium tabular-nums">{formatoNumero(fila.total)}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {fila.sistemaCr === null ? "—" : formatoNumero(fila.sistemaCr)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <Diferencia valor={fila.diferencia} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CargarSistemaCrDialog open={cargandoSistema} onOpenChange={setCargandoSistema} />
    </section>
  );
}

function Diferencia({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="text-muted-foreground">—</span>;
  if (valor === 0) return <span className="text-muted-foreground">0</span>;
  // Negativo: el sistema dice que hay más de lo que hay en bodega (posible faltante)
  return (
    <span className={`rounded px-1.5 py-0.5 font-medium ${valor < 0 ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-800"}`}>
      {valor > 0 ? "+" : ""}
      {formatoNumero(valor)}
    </span>
  );
}

function Casilla({ texto, valor, onChange }: { texto: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
      {texto}
    </label>
  );
}

function FilaMensaje({ columnas, children }: { columnas: number; children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={columnas} className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}

// CSV con ";" y BOM: Excel en español lo abre directo con las columnas separadas y tildes bien
function descargarCsv(data: Inventario) {
  const celda = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const numero = (v: number | null) => (v === null ? "" : String(v).replace(".", ","));
  const encabezado = ["CODIGO", "PRODUCTO", "UNIDAD", ...data.ubicaciones.map((u) => u.nombre.toUpperCase()), "TOTAL", "SISTEMACR", "DIFERENCIA"];
  const filas = data.filas.map((f) => [
    celda(f.codigo),
    celda(f.nombre),
    celda(f.unidad),
    ...data.ubicaciones.map((u) => numero(f.stock[u.id])),
    numero(f.total),
    numero(f.sistemaCr),
    numero(f.diferencia),
  ]);
  const csv = "﻿" + [encabezado.map(celda), ...filas].map((f) => f.join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = `inventario-${new Date().toISOString().slice(0, 10)}.csv`;
  enlace.click();
  URL.revokeObjectURL(url);
}
