import { useState } from "react";
import { ArrowRightIcon, PackageCheckIcon, TriangleAlertIcon, TruckIcon, Undo2Icon } from "lucide-react";
import { toast } from "sonner";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { aNumero } from "@/components/LineasProductos";
import { useAuth } from "@/features/auth/auth-context";
import { useCamiones } from "@/features/catalogos/catalogos.api";
import { formatoKg, formatoNumero } from "@/lib/formato";
import {
  NOMBRE_ESTADO,
  useCambiarCamion,
  useCancelarDespacho,
  useDespachar,
  useEmpacarLinea,
  type Despacho,
  type LineaDespacho,
} from "./empaque.api";

// Pantalla de empaque de un TRA: pendientes a la izquierda, empacados a la derecha,
// y el peso acumulado contra la capacidad del camión
export function DespachoVista({ despacho }: { despacho: Despacho }) {
  const editable = useAuth().puede("ADMIN", "OPERADOR") && (despacho.estado === "ABIERTO" || despacho.estado === "EMPACADO");
  const empacar = useEmpacarLinea();
  const despachar = useDespachar();
  const cancelar = useCancelarDespacho();
  const [confirmar, setConfirmar] = useState<"despachar" | "cancelar" | null>(null);
  const { resumen } = despacho;

  const pendientes = despacho.lineas.filter((l) => Number(l.cantidadEmpacada) < Number(l.cantidad));
  const empacadas = despacho.lineas.filter((l) => Number(l.cantidadEmpacada) > 0);
  // Artículos que hoy no alcanzan en el origen: se avisa antes de empacar, no al despachar
  const sinStock = editable ? despacho.lineas.filter((l) => l.disponibleOrigen !== undefined && l.disponibleOrigen < Number(l.cantidad)) : [];

  function fijarEmpacado(linea: LineaDespacho, cantidadEmpacada: number) {
    empacar.mutate(
      { despachoId: despacho.id, lineaId: linea.id, cantidadEmpacada },
      { onError: (e) => toast.error(e.message) },
    );
  }

  function ejecutar() {
    const accion = confirmar === "despachar" ? despachar : cancelar;
    accion.mutate(despacho.id, {
      onSuccess: () =>
        toast.success(confirmar === "despachar" ? `${despacho.documento} despachado: el stock ya se movió` : `${despacho.documento} cancelado`),
      onError: (e) => toast.error(e.message),
    });
  }

  return (
    <div className="grid gap-4">
      <Card>
        <CardContent className="grid gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-semibold">{despacho.documento}</h2>
                <Badge variant={despacho.estado === "EMPACADO" ? "default" : "secondary"}>{NOMBRE_ESTADO[despacho.estado]}</Badge>
              </div>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                {despacho.origen.nombre} <ArrowRightIcon className="size-3" /> {despacho.destino?.nombre}
                {despacho.notas && <> · {despacho.notas}</>}
              </p>
            </div>
            <SelectorCamion despacho={despacho} editable={editable} />
          </div>
          <BarraPeso empacado={resumen.pesoEmpacadoKg} total={resumen.pesoTotalKg} capacidad={resumen.capacidadKg} />
          {sinStock.length > 0 && (
            <p className="flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              <TriangleAlertIcon className="mt-0.5 size-4 shrink-0" />
              <span>
                No alcanza el stock en {despacho.origen.nombre} para:{" "}
                {sinStock.map((l) => `${l.producto.codigo} (hay ${formatoNumero(l.disponibleOrigen)}, pide ${formatoNumero(l.cantidad)})`).join(", ")}.
                No se podrá despachar hasta registrar la entrada o corregir el TRA.
              </span>
            </p>
          )}
          {resumen.lineasSinPeso > 0 && (
            <p className="flex items-center gap-2 text-sm text-amber-700">
              <TriangleAlertIcon className="size-4" />
              {resumen.lineasSinPeso} artículo(s) sin peso registrado: no suman al camión. Agrega el peso en Productos.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Pendientes ({pendientes.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {pendientes.length === 0 && <p className="text-sm text-muted-foreground">Todo está empacado.</p>}
            {pendientes.map((linea) => (
              // La key incluye lo empacado: al cambiar, el input vuelve a proponer lo que falta
              <LineaPendiente key={`${linea.id}-${linea.cantidadEmpacada}`} linea={linea} editable={editable} ocupado={empacar.isPending} onEmpacar={fijarEmpacado} />
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Empacados ({empacadas.length})</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {empacadas.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay nada empacado.</p>}
            {empacadas.map((linea) => (
              <div key={linea.id} className="flex items-center gap-3 rounded-md border bg-emerald-50/50 p-2">
                <PackageCheckIcon className="size-4 shrink-0 text-emerald-700" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs">{linea.producto.codigo}</div>
                  <div className="truncate text-sm">{linea.producto.nombre}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatoNumero(linea.cantidadEmpacada)} de {formatoNumero(linea.cantidad)} {linea.producto.unidad} ·{" "}
                    {formatoKg(Number(linea.cantidadEmpacada) * Number(linea.pesoUnitarioKg))}
                  </div>
                </div>
                {editable && (
                  <Button variant="ghost" size="icon-sm" title="Quitar del empaque" aria-label="Quitar del empaque" disabled={empacar.isPending} onClick={() => fijarEmpacado(linea, 0)}>
                    <Undo2Icon />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {editable && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => setConfirmar("cancelar")}>
            Cancelar despacho
          </Button>
          <Button onClick={() => setConfirmar("despachar")} disabled={despacho.estado !== "EMPACADO"}>
            <TruckIcon />
            Despachar
          </Button>
        </div>
      )}

      <AlertDialog open={confirmar !== null} onOpenChange={(v) => !v && setConfirmar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmar === "despachar" ? `¿Despachar ${despacho.documento}?` : `¿Cancelar ${despacho.documento}?`}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmar === "despachar"
                ? `Se registra el traslado y el stock pasa de ${despacho.origen.nombre} a ${despacho.destino?.nombre}. No se puede deshacer.`
                : "El despacho queda cancelado y no se mueve ningún stock."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction variant={confirmar === "cancelar" ? "destructive" : "default"} onClick={ejecutar}>
              {confirmar === "despachar" ? "Sí, despachar" : "Sí, cancelar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function LineaPendiente({
  linea,
  editable,
  ocupado,
  onEmpacar,
}: {
  linea: LineaDespacho;
  editable: boolean;
  ocupado: boolean;
  onEmpacar: (linea: LineaDespacho, cantidadEmpacada: number) => void;
}) {
  const faltan = Number(linea.cantidad) - Number(linea.cantidadEmpacada);
  const [cantidad, setCantidad] = useState(String(faltan));
  const peso = Number(linea.pesoUnitarioKg);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border p-2">
      <div className="min-w-0 flex-1">
        <div className="font-mono text-xs">{linea.producto.codigo}</div>
        <div className="truncate text-sm">{linea.producto.nombre}</div>
        <div className="text-xs text-muted-foreground">
          Faltan {formatoNumero(faltan)} de {formatoNumero(linea.cantidad)} {linea.producto.unidad} ·{" "}
          {peso > 0 ? `${formatoKg(peso)} c/u` : <span className="text-amber-700">sin peso</span>}
        </div>
        {linea.disponibleOrigen !== undefined && (
          <div className={`text-xs ${linea.disponibleOrigen < Number(linea.cantidad) ? "font-medium text-red-700" : "text-muted-foreground"}`}>
            Disponible en origen: {formatoNumero(linea.disponibleOrigen)}
          </div>
        )}
      </div>
      {editable && (
        <div className="flex items-center gap-1">
          <Input className="w-20" inputMode="decimal" aria-label="Cantidad a empacar" value={cantidad} onChange={(e) => setCantidad(e.target.value)} />
          <Button
            size="sm"
            disabled={ocupado}
            onClick={() => {
              const n = aNumero(cantidad);
              if (n === null || n <= 0) return toast.error("Escribe cuántas unidades empacar");
              onEmpacar(linea, Math.min(Number(linea.cantidad), Number(linea.cantidadEmpacada) + n));
            }}
          >
            Empacar
          </Button>
        </div>
      )}
    </div>
  );
}

function BarraPeso({ empacado, total, capacidad }: { empacado: number; total: number; capacidad: number | null }) {
  const limite = capacidad ?? total;
  const porcentaje = limite > 0 ? Math.min(100, (empacado / limite) * 100) : 0;
  const color = porcentaje >= 100 ? "bg-red-500" : porcentaje >= 85 ? "bg-amber-500" : "bg-emerald-500";
  return (
    <div className="grid gap-1.5">
      <div className="flex flex-wrap justify-between gap-2 text-sm">
        <span>
          <strong className="tabular-nums">{formatoKg(empacado)}</strong> empacados
          {capacidad !== null && <> de {formatoKg(capacidad)} del camión</>}
        </span>
        <span className="text-muted-foreground">Total del TRA: {formatoKg(total)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={Math.round(porcentaje)} aria-valuemin={0} aria-valuemax={100}>
        <div className={`h-full transition-all ${color}`} style={{ width: `${porcentaje}%` }} />
      </div>
      {capacidad !== null && total > capacidad && (
        <p className="text-sm text-red-700">
          El TRA completo pesa {formatoKg(total)} y no cabe en un viaje: hay que dividirlo en dos TRA.
        </p>
      )}
    </div>
  );
}

function SelectorCamion({ despacho, editable }: { despacho: Despacho; editable: boolean }) {
  const { data: camiones = [] } = useCamiones();
  const cambiar = useCambiarCamion();
  if (!editable || camiones.length <= 1) {
    return despacho.camion ? (
      <span className="flex items-center gap-1 text-sm text-muted-foreground">
        <TruckIcon className="size-4" /> {despacho.camion.nombre}
      </span>
    ) : null;
  }
  return (
    <Select
      value={despacho.camion ? String(despacho.camion.id) : ""}
      onValueChange={(v) => cambiar.mutate({ despachoId: despacho.id, camionId: Number(v) }, { onError: (e) => toast.error(e.message) })}
    >
      <SelectTrigger className="w-56" aria-label="Camión">
        <SelectValue placeholder="Elige camión" />
      </SelectTrigger>
      <SelectContent>
        {camiones.map((c) => (
          <SelectItem key={c.id} value={String(c.id)}>
            {c.nombre} ({formatoKg(c.capacidadKg)})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
