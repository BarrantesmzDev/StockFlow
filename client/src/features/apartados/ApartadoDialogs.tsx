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
import { Textarea } from "@/components/ui/textarea";
import { useUbicaciones } from "@/features/catalogos/catalogos.api";
import { erroresPorCampo } from "@/lib/api";
import { formatoNumero } from "@/lib/formato";
import { useCrearApartado, useEntregarApartado, type Apartado } from "./apartados.api";

// ---------- Apartar ----------

export function NuevoApartadoDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Apartar mercadería</DialogTitle>
          <DialogDescription>Se traslada a la ubicación de Apartados hasta que se entregue o se cancele.</DialogDescription>
        </DialogHeader>
        <FormularioApartar onListo={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function FormularioApartar({ onListo }: { onListo: () => void }) {
  const crear = useCrearApartado();
  const { data: ubicaciones = [] } = useUbicaciones();
  const bodega = ubicaciones.find((u) => u.tipo === "BODEGA");
  const [cliente, setCliente] = useState("");
  const [telefono, setTelefono] = useState("");
  const [origenId, setOrigenId] = useState<number | null>(bodega?.id ?? null);
  const [notas, setNotas] = useState("");
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia()]);
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function guardar(evento: FormEvent) {
    evento.preventDefault();
    setErrores({});
    setErrorGeneral(null);
    crear.mutate(
      {
        cliente,
        telefono: telefono || undefined,
        origenId: origenId ?? bodega?.id,
        notas: notas || undefined,
        lineas: lineas.map((l) => ({ productoId: l.producto?.id ?? null, cantidad: aNumero(l.cantidad) })),
      },
      {
        onSuccess: (creados) => {
          toast.success(`Apartado para ${cliente}: ${creados.length} producto(s)`);
          onListo();
        },
        onError: (error) => {
          const porCampo = erroresPorCampo(error);
          setErrores(porCampo);
          if (Object.keys(porCampo).length === 0) setErrorGeneral(error.message);
        },
      },
    );
  }

  return (
    <form onSubmit={guardar} className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Campo id="cliente" label="Cliente *" error={errores.cliente}>
          <Input id="cliente" value={cliente} onChange={(e) => setCliente(e.target.value)} aria-invalid={!!errores.cliente} autoFocus />
        </Campo>
        <Campo id="telefono" label="Teléfono" error={errores.telefono}>
          <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </Campo>
        <Campo id="origen" label="Sale de *" error={errores.origenId}>
          <UbicacionSelect id="origen" value={origenId ?? bodega?.id ?? null} onChange={setOrigenId} excluirTipos={["APARTADOS"]} />
        </Campo>
      </div>
      <LineasProductos lineas={lineas} onChange={setLineas} errores={errores} />
      <Campo id="notas" label="Notas">
        <Textarea id="notas" rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
      </Campo>
      {errorGeneral && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{errorGeneral}</p>}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={crear.isPending}>
          {crear.isPending ? "Guardando…" : "Apartar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ---------- Entregar ----------

export function EntregarApartadoDialog({ apartado, onOpenChange }: { apartado: Apartado | null; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={apartado !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Entregar apartado</DialogTitle>
          <DialogDescription>
            {apartado &&
              `${formatoNumero(apartado.cantidad)} ${apartado.producto.unidad} de ${apartado.producto.codigo} para ${apartado.cliente}. Se registra como venta desde Apartados.`}
          </DialogDescription>
        </DialogHeader>
        {apartado && <FormularioEntregar apartado={apartado} onListo={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FormularioEntregar({ apartado, onListo }: { apartado: Apartado; onListo: () => void }) {
  const entregar = useEntregarApartado();
  const [factura, setFactura] = useState("");
  const [serie, setSerie] = useState("");
  const [codigoGarantia, setCodigoGarantia] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});

  function guardar(evento: FormEvent) {
    evento.preventDefault();
    entregar.mutate(
      { id: apartado.id, factura, serie: serie || undefined, codigoGarantia: codigoGarantia || undefined },
      {
        onSuccess: () => {
          toast.success(`Apartado #${apartado.id} entregado`);
          onListo();
        },
        onError: (error) => {
          const porCampo = erroresPorCampo(error);
          setErrores(porCampo);
          if (Object.keys(porCampo).length === 0) toast.error(error.message);
        },
      },
    );
  }

  return (
    <form onSubmit={guardar} className="grid gap-4">
      <Campo id="factura" label="Factura *" error={errores.factura}>
        <Input id="factura" value={factura} onChange={(e) => setFactura(e.target.value)} aria-invalid={!!errores.factura} autoFocus />
      </Campo>
      <div className="grid grid-cols-2 gap-4">
        <Campo id="serie" label="Serie">
          <Input id="serie" value={serie} onChange={(e) => setSerie(e.target.value)} />
        </Campo>
        <Campo id="ep" label="EP (garantía)">
          <Input id="ep" value={codigoGarantia} onChange={(e) => setCodigoGarantia(e.target.value)} />
        </Campo>
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={entregar.isPending}>
          {entregar.isPending ? "Guardando…" : "Entregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
