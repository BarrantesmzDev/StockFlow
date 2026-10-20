import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Campo } from "@/components/Campo";
import { aNumero, LineasProductos, lineaVacia, type LineaForm } from "@/components/LineasProductos";
import { UbicacionSelect } from "@/components/UbicacionSelect";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ApiError, erroresPorCampo } from "@/lib/api";
import { hoyISO } from "@/lib/formato";
import { NOMBRE_TIPO, useRegistrarMovimiento, type TipoMovimiento } from "./movimientos.api";

const AYUDA: Record<TipoMovimiento, string> = {
  ENTRADA: "Mercadería que ingresa (compra, factura de proveedor, boleta).",
  VENTA: "Venta con factura: sale del stock de la ubicación.",
  DEVOLUCION: "Devolución con nota de crédito: el material regresa al inventario.",
  TRASLADO: "Movimiento interno de mercadería entre ubicaciones propias, con su número de TRA.",
  AJUSTE: "Conteo físico: escribe cuánto HAY. El sistema registra la diferencia.",
};

export function NuevoMovimientoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Nuevo movimiento</DialogTitle>
          <DialogDescription>Todas las líneas se guardan juntas: si una falla, no se guarda ninguna.</DialogDescription>
        </DialogHeader>
        <Formulario onListo={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function Formulario({ onListo }: { onListo: () => void }) {
  const registrar = useRegistrarMovimiento();
  const [tipo, setTipo] = useState<TipoMovimiento>("VENTA");
  const [origenId, setOrigenId] = useState<number | null>(null);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [documento, setDocumento] = useState("");
  const [factura, setFactura] = useState("");
  const [notaCredito, setNotaCredito] = useState("");
  const [cliente, setCliente] = useState("");
  const [fecha, setFecha] = useState(hoyISO());
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia()]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const usaOrigen = tipo === "VENTA" || tipo === "TRASLADO";
  const usaDestino = tipo === "ENTRADA" || tipo === "DEVOLUCION" || tipo === "TRASLADO";

  function armarDatos(): Record<string, unknown> {
    // Si la fecha es hoy, la pone el servidor con la hora exacta. Si no, mediodía de ese día.
    const fechaEnviar = fecha && fecha !== hoyISO() ? new Date(`${fecha}T12:00:00`).toISOString() : undefined;
    const comunes = { fecha: fechaEnviar, notas: notas || undefined };
    const productoId = (l: LineaForm) => l.producto?.id ?? null;

    if (tipo === "AJUSTE") {
      return {
        tipo,
        ubicacionId: origenId,
        documento: documento || undefined,
        ...comunes,
        notas,
        lineas: lineas.map((l) => ({ productoId: productoId(l), cantidadContada: aNumero(l.cantidad) })),
      };
    }
    const lineasEnviar = lineas.map((l) => ({
      productoId: productoId(l),
      cantidad: aNumero(l.cantidad),
      serie: l.serie || undefined,
      codigoGarantia: l.codigoGarantia || undefined,
    }));
    switch (tipo) {
      case "ENTRADA":
        return { tipo, destinoId, documento: documento || undefined, lineas: lineasEnviar, ...comunes };
      case "VENTA":
        return { tipo, origenId, factura, cliente: cliente || undefined, lineas: lineasEnviar, ...comunes };
      case "DEVOLUCION":
        return { tipo, destinoId, notaCredito, factura: factura || undefined, cliente: cliente || undefined, lineas: lineasEnviar, ...comunes };
      case "TRASLADO":
        return { tipo, origenId, destinoId, documento, lineas: lineasEnviar, ...comunes };
    }
  }

  function guardar(evento: FormEvent) {
    evento.preventDefault();
    setErrores({});
    setErrorGeneral(null);
    registrar.mutate(armarDatos(), {
      onSuccess: (r) => {
        toast.success(
          r.registrados === 0
            ? "El conteo coincide con el sistema: no hubo que ajustar nada"
            : `${NOMBRE_TIPO[tipo]} registrada: ${r.registrados} línea(s)`,
        );
        onListo();
      },
      onError: (error) => {
        const porCampo = erroresPorCampo(error);
        setErrores(porCampo);
        if (Object.keys(porCampo).length === 0 || (error instanceof ApiError && error.status !== 400)) {
          setErrorGeneral(error.message);
        }
      },
    });
  }

  return (
    <form onSubmit={guardar} className="grid gap-4">
      <Tabs
        value={tipo}
        onValueChange={(v) => {
          setTipo(v as TipoMovimiento);
          setErrores({});
          setErrorGeneral(null);
        }}
      >
        <TabsList className="flex h-auto w-full flex-wrap">
          {(Object.keys(NOMBRE_TIPO) as TipoMovimiento[]).map((t) => (
            <TabsTrigger key={t} value={t} className="flex-1">
              {NOMBRE_TIPO[t]}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <p className="-mt-2 text-sm text-muted-foreground">{AYUDA[tipo]}</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {tipo === "AJUSTE" && (
          <Campo id="ubicacion" label="Ubicación contada *" error={errores.ubicacionId}>
            <UbicacionSelect id="ubicacion" value={origenId} onChange={setOrigenId} excluirTipos={["APARTADOS"]} invalido={!!errores.ubicacionId} />
          </Campo>
        )}
        {usaOrigen && (
          <Campo id="origen" label={tipo === "VENTA" ? "Vendido desde *" : "Origen *"} error={errores.origenId}>
            <UbicacionSelect id="origen" value={origenId} onChange={setOrigenId} excluirTipos={["APARTADOS"]} excluirId={tipo === "TRASLADO" ? destinoId : null} invalido={!!errores.origenId} />
          </Campo>
        )}
        {usaDestino && (
          <Campo id="destino" label={tipo === "DEVOLUCION" ? "Regresa a *" : "Destino *"} error={errores.destinoId}>
            <UbicacionSelect id="destino" value={destinoId} onChange={setDestinoId} excluirTipos={["APARTADOS"]} excluirId={tipo === "TRASLADO" ? origenId : null} invalido={!!errores.destinoId} />
          </Campo>
        )}
        {tipo === "TRASLADO" && (
          <Campo id="tra" label="Número de TRA *" error={errores.documento} ayuda="Ej. 2394 o TRA-2394">
            <Input id="tra" value={documento} onChange={(e) => setDocumento(e.target.value)} aria-invalid={!!errores.documento} />
          </Campo>
        )}
        {(tipo === "ENTRADA" || tipo === "AJUSTE") && (
          <Campo id="documento" label="Documento" error={errores.documento} ayuda={tipo === "ENTRADA" ? "Factura de compra, boleta… (opcional)" : "Boleta o respaldo (opcional)"}>
            <Input id="documento" value={documento} onChange={(e) => setDocumento(e.target.value)} />
          </Campo>
        )}
        {tipo === "DEVOLUCION" && (
          <Campo id="nc" label="Nota de crédito *" error={errores.notaCredito}>
            <Input id="nc" value={notaCredito} onChange={(e) => setNotaCredito(e.target.value)} aria-invalid={!!errores.notaCredito} />
          </Campo>
        )}
        {(tipo === "VENTA" || tipo === "DEVOLUCION") && (
          <Campo id="factura" label={tipo === "VENTA" ? "Factura *" : "Factura original"} error={errores.factura}>
            <Input id="factura" value={factura} onChange={(e) => setFactura(e.target.value)} aria-invalid={!!errores.factura} />
          </Campo>
        )}
        {(tipo === "VENTA" || tipo === "DEVOLUCION") && (
          <Campo id="cliente" label="Cliente" error={errores.cliente}>
            <Input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} />
          </Campo>
        )}
        <Campo id="fecha" label="Fecha" error={errores.fecha}>
          <Input id="fecha" type="date" value={fecha} max={hoyISO()} onChange={(e) => setFecha(e.target.value)} />
        </Campo>
      </div>

      <LineasProductos
        lineas={lineas}
        onChange={setLineas}
        conSerie={tipo === "VENTA" || tipo === "ENTRADA" || tipo === "DEVOLUCION"}
        etiquetaCantidad={tipo === "AJUSTE" ? "Contado" : "Cantidad"}
        errores={errores}
      />

      <Campo id="notas" label={tipo === "AJUSTE" ? "Motivo del ajuste *" : "Notas"} error={errores.notas}>
        <Textarea id="notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} aria-invalid={!!errores.notas} />
      </Campo>

      {errorGeneral && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {errorGeneral}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onListo} disabled={registrar.isPending}>
          Cancelar
        </Button>
        <Button type="submit" disabled={registrar.isPending}>
          {registrar.isPending ? "Guardando…" : `Registrar ${NOMBRE_TIPO[tipo].toLowerCase()}`}
        </Button>
      </DialogFooter>
    </form>
  );
}
