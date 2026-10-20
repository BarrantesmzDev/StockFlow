import { useState, type ReactNode } from "react";
import { PlusIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Encabezado } from "@/components/Encabezado";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/features/auth/auth-context";
import { useDebounce } from "@/hooks/use-debounce";
import { formatoFecha, formatoNumero } from "@/lib/formato";
import { useApartados, useCancelarApartado, type Apartado, type EstadoApartado } from "./apartados.api";
import { EntregarApartadoDialog, NuevoApartadoDialog } from "./ApartadoDialogs";

const ESTADOS: { valor: EstadoApartado; texto: string }[] = [
  { valor: "ACTIVO", texto: "Activos" },
  { valor: "ENTREGADO", texto: "Entregados" },
  { valor: "CANCELADO", texto: "Cancelados" },
];

export function ApartadosPage() {
  const editable = useAuth().puede("ADMIN", "OPERADOR");
  const [estado, setEstado] = useState<EstadoApartado>("ACTIVO");
  const [buscar, setBuscar] = useState("");
  const [nuevo, setNuevo] = useState(false);
  const [entregando, setEntregando] = useState<Apartado | null>(null);
  const [cancelando, setCancelando] = useState<Apartado | null>(null);
  const buscarDebounced = useDebounce(buscar);
  const { data: apartados = [], isPending, isError, error } = useApartados(estado, buscarDebounced);
  const cancelar = useCancelarApartado();

  function confirmarCancelacion() {
    if (!cancelando) return;
    cancelar.mutate(
      { id: cancelando.id },
      {
        onSuccess: (a) => toast.success(`Apartado #${a.id} cancelado: la mercadería volvió a ${a.origen.nombre}`),
        onError: (e) => toast.error(e.message),
      },
    );
  }

  return (
    <section className="flex flex-col gap-4">
      <Encabezado titulo="Apartados" descripcion="Mercadería reservada para clientes.">
        {editable && (
          <Button onClick={() => setNuevo(true)}>
            <PlusIcon />
            Apartar
          </Button>
        )}
      </Encabezado>

      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={estado} onValueChange={(v) => setEstado(v as EstadoApartado)}>
          <TabsList>
            {ESTADOS.map((e) => (
              <TabsTrigger key={e.valor} value={e.valor}>
                {e.texto}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="relative w-full sm:w-72">
          <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={buscar} onChange={(e) => setBuscar(e.target.value)} placeholder="Cliente, teléfono, producto…" className="pl-8" aria-label="Buscar apartados" />
        </div>
      </div>

      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-24">#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead className="min-w-52">Producto</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead>{estado === "ACTIVO" ? "Apartado el" : "Cerrado el"}</TableHead>
              {estado === "ENTREGADO" && <TableHead>Factura</TableHead>}
              {estado === "ACTIVO" && editable && <TableHead className="text-right">Acciones</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <FilaMensaje>Cargando…</FilaMensaje>
            ) : isError ? (
              <FilaMensaje>
                <span className="text-destructive">{error.message}</span>
              </FilaMensaje>
            ) : apartados.length === 0 ? (
              <FilaMensaje>No hay apartados {ESTADOS.find((e) => e.valor === estado)?.texto.toLowerCase()}.</FilaMensaje>
            ) : (
              apartados.map((a) => (
                <TableRow key={a.id} title={a.notas ?? undefined}>
                  <TableCell className="text-xs text-muted-foreground">#{a.id}</TableCell>
                  <TableCell>
                    {a.cliente}
                    {a.telefono && <div className="text-xs text-muted-foreground">{a.telefono}</div>}
                  </TableCell>
                  <TableCell className="whitespace-normal">
                    <span className="font-mono text-xs">{a.producto.codigo}</span>
                    <div className="text-xs text-muted-foreground">{a.producto.nombre}</div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatoNumero(a.cantidad)} <span className="text-xs text-muted-foreground">{a.producto.unidad}</span>
                  </TableCell>
                  <TableCell className="text-sm">{a.origen.nombre}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatoFecha(estado === "ACTIVO" ? a.creadoEn : a.cerradoEn)}</TableCell>
                  {estado === "ENTREGADO" && <TableCell className="text-sm">{a.factura}</TableCell>}
                  {estado === "ACTIVO" && editable && (
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" onClick={() => setEntregando(a)}>
                          Entregar
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setCancelando(a)}>
                          Cancelar
                        </Button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NuevoApartadoDialog open={nuevo} onOpenChange={setNuevo} />
      <EntregarApartadoDialog apartado={entregando} onOpenChange={(v) => !v && setEntregando(null)} />
      <AlertDialog open={cancelando !== null} onOpenChange={(v) => !v && setCancelando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Cancelar el apartado #{cancelando?.id}?</AlertDialogTitle>
            <AlertDialogDescription>
              {cancelando &&
                `${formatoNumero(cancelando.cantidad)} ${cancelando.producto.unidad} de ${cancelando.producto.codigo} vuelven a ${cancelando.origen.nombre}.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={confirmarCancelacion}>
              Sí, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function FilaMensaje({ children }: { children: ReactNode }) {
  return (
    <TableRow>
      <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
        {children}
      </TableCell>
    </TableRow>
  );
}
