import { useState, type ReactNode } from "react";
import { ArrowRightIcon, PlusIcon, SearchIcon } from "lucide-react";
import { Encabezado } from "@/components/Encabezado";
import { Paginacion } from "@/components/Paginacion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { useUbicaciones } from "@/features/catalogos/catalogos.api";
import { useDebounce } from "@/hooks/use-debounce";
import { formatoFechaHora, formatoNumero } from "@/lib/formato";
import { COLOR_TIPO, NOMBRE_TIPO, useMovimientos, type TipoMovimiento } from "./movimientos.api";
import { NuevoMovimientoDialog } from "./NuevoMovimientoDialog";

const TODOS = "todos";

export function MovimientosPage() {
  const { puede } = useAuth();
  const { data: ubicaciones = [] } = useUbicaciones();
  const [tipo, setTipo] = useState<TipoMovimiento>();
  const [ubicacionId, setUbicacionId] = useState<number>();
  const [buscar, setBuscar] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");
  const [pagina, setPagina] = useState(1);
  const [nuevo, setNuevo] = useState(false);
  const buscarDebounced = useDebounce(buscar);

  const { data, isPending, isError, error, isFetching } = useMovimientos({
    tipo,
    ubicacionId,
    buscar: buscarDebounced,
    desde: desde || undefined,
    hasta: hasta || undefined,
    pagina,
  });

  // Cualquier cambio de filtro vuelve a la página 1
  const filtrar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPagina(1);
  };

  return (
    <section className="flex flex-col gap-4">
      <Encabezado titulo="Movimientos" descripcion="Entradas, ventas, devoluciones, traslados (TRA) y ajustes.">
        {puede("ADMIN", "OPERADOR") && (
          <Button onClick={() => setNuevo(true)}>
            <PlusIcon />
            Nuevo movimiento
          </Button>
        )}
      </Encabezado>

      <div className="flex flex-wrap items-end gap-3">
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscar}
            onChange={(e) => filtrar(setBuscar)(e.target.value)}
            placeholder="TRA, factura, cliente, serie, EP…"
            className="pl-8"
            aria-label="Buscar movimientos"
          />
        </div>
        <Select value={tipo ?? TODOS} onValueChange={(v) => filtrar(setTipo)(v === TODOS ? undefined : (v as TipoMovimiento))}>
          <SelectTrigger className="w-40" aria-label="Tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos los tipos</SelectItem>
            {(Object.keys(NOMBRE_TIPO) as TipoMovimiento[]).map((t) => (
              <SelectItem key={t} value={t}>
                {NOMBRE_TIPO[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={ubicacionId ? String(ubicacionId) : TODOS} onValueChange={(v) => filtrar(setUbicacionId)(v === TODOS ? undefined : Number(v))}>
          <SelectTrigger className="w-44" aria-label="Ubicación">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas las ubicaciones</SelectItem>
            {ubicaciones.map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Desde
          <Input type="date" className="w-40" value={desde} onChange={(e) => filtrar(setDesde)(e.target.value)} />
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Hasta
          <Input type="date" className="w-40" value={hasta} onChange={(e) => filtrar(setHasta)(e.target.value)} />
        </label>
        {isFetching && !isPending && <span className="pb-2 text-xs text-muted-foreground">Actualizando…</span>}
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Fecha</TableHead>
              <TableHead className="w-28">Tipo</TableHead>
              <TableHead className="min-w-52">Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Ubicación</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Serie / EP</TableHead>
              <TableHead>Usuario</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <FilaMensaje>Cargando movimientos…</FilaMensaje>
            ) : isError ? (
              <FilaMensaje>
                <span className="text-destructive">{error.message}</span>
              </FilaMensaje>
            ) : data.items.length === 0 ? (
              <FilaMensaje>No hay movimientos con estos filtros.</FilaMensaje>
            ) : (
              data.items.map((m) => (
                <TableRow key={m.id} title={m.notas ?? undefined}>
                  <TableCell className="text-xs text-muted-foreground">{formatoFechaHora(m.fecha)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={COLOR_TIPO[m.tipo]}>
                      {NOMBRE_TIPO[m.tipo]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <span className="font-mono text-xs">{m.producto.codigo}</span>
                    <div className="text-xs text-muted-foreground">{m.producto.nombre}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatoNumero(m.cantidad)} <span className="text-xs text-muted-foreground">{m.producto.unidad}</span>
                  </TableCell>
                  <TableCell className="text-sm">
                    <span className="inline-flex items-center gap-1">
                      {m.origen?.nombre ?? <span className="text-muted-foreground">—</span>}
                      <ArrowRightIcon className="size-3 text-muted-foreground" />
                      {m.destino?.nombre ?? <span className="text-muted-foreground">—</span>}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {m.documento ?? (m.factura ? `Fact. ${m.factura}` : null) ?? "—"}
                    {m.notaCredito && <div className="text-xs text-muted-foreground">NC {m.notaCredito}</div>}
                    {m.documento && m.factura && <div className="text-xs text-muted-foreground">Fact. {m.factura}</div>}
                  </TableCell>
                  <TableCell className="max-w-40 truncate text-sm">{m.cliente ?? "—"}</TableCell>
                  <TableCell className="text-xs">
                    {m.serie || m.codigoGarantia ? (
                      <>
                        {m.serie && <div>S: {m.serie}</div>}
                        {m.codigoGarantia && <div>EP: {m.codigoGarantia}</div>}
                      </>
                    ) : (
                      "—"
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{m.usuario?.nombre ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {data && data.total > 0 && <Paginacion pagina={pagina} tamano={data.tamano} total={data.total} onCambiar={setPagina} />}

      <NuevoMovimientoDialog open={nuevo} onOpenChange={setNuevo} />
    </section>
  );
}

function FilaMensaje({ children }: { children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}
