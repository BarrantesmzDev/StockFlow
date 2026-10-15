import { useState, type ReactNode } from "react";
import { ArchiveIcon, PencilIcon, PlusIcon, RotateCcwIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useDebounce } from "@/hooks/use-debounce";
import { DesactivarProductoDialog } from "./DesactivarProductoDialog";
import { ProductoFormDialog } from "./ProductoFormDialog";
import { useActualizarProducto, useProductos, type Producto } from "./productos.api";

const formatoPeso = new Intl.NumberFormat("es-CR", { maximumFractionDigits: 3 });

export function ProductosPage() {
  const [buscar, setBuscar] = useState("");
  const [incluirInactivos, setIncluirInactivos] = useState(false);
  const buscarDebounced = useDebounce(buscar);

  const {
    data: productos = [],
    isPending,
    isError,
    error,
    isFetching,
    refetch,
  } = useProductos({ buscar: buscarDebounced, incluirInactivos });

  // Qué diálogo está abierto: formulario (nuevo/editar) o confirmación de desactivar
  const [formAbierto, setFormAbierto] = useState(false);
  const [editando, setEditando] = useState<Producto | null>(null);
  const [desactivando, setDesactivando] = useState<Producto | null>(null);

  const actualizar = useActualizarProducto();

  function abrirNuevo() {
    setEditando(null);
    setFormAbierto(true);
  }

  function abrirEditar(producto: Producto) {
    setEditando(producto);
    setFormAbierto(true);
  }

  function reactivar(producto: Producto) {
    actualizar.mutate(
      { id: producto.id, datos: { activo: true } },
      {
        onSuccess: (p) => toast.success(`Producto ${p.codigo} reactivado`),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Catálogo de artículos.{" "}
            {!isPending && !isError && `${productos.length} en la lista.`}
          </p>
        </div>
        <Button onClick={abrirNuevo}>
          <PlusIcon />
          Nuevo producto
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-80">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={buscar}
            onChange={(e) => setBuscar(e.target.value)}
            placeholder="Buscar por código o nombre…"
            className="pl-8"
            aria-label="Buscar productos"
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={incluirInactivos}
            onChange={(e) => setIncluirInactivos(e.target.checked)}
            className="size-4 accent-primary"
          />
          Mostrar inactivos
        </label>
        {isFetching && !isPending && (
          <span className="text-xs text-muted-foreground">Actualizando…</span>
        )}
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">Código</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden w-24 sm:table-cell">Unidad</TableHead>
              <TableHead className="w-28 text-right">Peso</TableHead>
              <TableHead className="hidden w-24 sm:table-cell">Estado</TableHead>
              <TableHead className="w-28 text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <FilaMensaje>Cargando productos…</FilaMensaje>
            ) : isError ? (
              <FilaMensaje>
                <span className="text-destructive">{error.message}</span>{" "}
                <Button variant="link" size="sm" onClick={() => refetch()}>
                  Reintentar
                </Button>
              </FilaMensaje>
            ) : productos.length === 0 ? (
              <FilaMensaje>
                {buscarDebounced
                  ? `Ningún producto coincide con «${buscarDebounced}».`
                  : "Todavía no hay productos. Crea el primero con «Nuevo producto»."}
              </FilaMensaje>
            ) : (
              productos.map((producto) => (
                <TableRow key={producto.id} className={producto.activo ? "" : "opacity-60"}>
                  <TableCell className="font-mono text-xs">{producto.codigo}</TableCell>
                  <TableCell className="whitespace-normal">{producto.nombre}</TableCell>
                  <TableCell className="hidden sm:table-cell">{producto.unidad}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {producto.pesoKg === null
                      ? "—"
                      : `${formatoPeso.format(Number(producto.pesoKg))} kg`}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {producto.activo ? (
                      <Badge variant="secondary">Activo</Badge>
                    ) : (
                      <Badge variant="outline">Inactivo</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => abrirEditar(producto)}
                        aria-label={`Editar ${producto.codigo}`}
                        title="Editar"
                      >
                        <PencilIcon />
                      </Button>
                      {producto.activo ? (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setDesactivando(producto)}
                          aria-label={`Desactivar ${producto.codigo}`}
                          title="Desactivar"
                        >
                          <ArchiveIcon />
                        </Button>
                      ) : (
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => reactivar(producto)}
                          aria-label={`Reactivar ${producto.codigo}`}
                          title="Reactivar"
                        >
                          <RotateCcwIcon />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ProductoFormDialog open={formAbierto} onOpenChange={setFormAbierto} producto={editando} />
      <DesactivarProductoDialog
        producto={desactivando}
        onOpenChange={(open) => !open && setDesactivando(null)}
      />
    </section>
  );
}

function FilaMensaje({ children }: { children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}
