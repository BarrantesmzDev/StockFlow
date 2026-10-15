import { useState, type FormEvent, type ReactNode } from "react";
import { toast } from "sonner";
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
import { Label } from "@/components/ui/label";
import { ApiError } from "@/lib/api";
import {
  useActualizarProducto,
  useCrearProducto,
  type Producto,
  type ProductoInput,
} from "./productos.api";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  // null = crear uno nuevo; con producto = editar ese producto
  producto: Producto | null;
};

export function ProductoFormDialog({ open, onOpenChange, producto }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{producto ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {producto
              ? `Código actual: ${producto.codigo}`
              : "El código debe ser único. La unidad por defecto es UND."}
          </DialogDescription>
        </DialogHeader>
        {/* El formulario se monta cada vez que se abre el diálogo, así arranca con datos frescos */}
        <ProductoForm producto={producto} onListo={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

type Campos = { codigo: string; nombre: string; unidad: string; pesoKg: string };

function ProductoForm({ producto, onListo }: { producto: Producto | null; onListo: () => void }) {
  const [campos, setCampos] = useState<Campos>({
    codigo: producto?.codigo ?? "",
    nombre: producto?.nombre ?? "",
    unidad: producto?.unidad ?? "UND",
    pesoKg: producto?.pesoKg ?? "",
  });
  // Errores por campo que devuelve la API (400 de Zod o 409 de código repetido)
  const [errores, setErrores] = useState<Partial<Record<keyof Campos, string>>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  const crear = useCrearProducto();
  const actualizar = useActualizarProducto();
  const guardando = crear.isPending || actualizar.isPending;

  function cambiar(campo: keyof Campos, valor: string) {
    setCampos((anteriores) => ({ ...anteriores, [campo]: valor }));
    setErrores((anteriores) => ({ ...anteriores, [campo]: undefined }));
  }

  function mostrarError(error: Error) {
    setErrorGeneral(null);
    if (error instanceof ApiError) {
      if (error.status === 409) {
        setErrores({ codigo: error.message });
        return;
      }
      const porCampo = error.detalles.filter((d) => d.campo in campos);
      if (porCampo.length > 0) {
        setErrores(Object.fromEntries(porCampo.map((d) => [d.campo, d.mensaje])));
        return;
      }
    }
    setErrorGeneral(error.message);
  }

  function guardar(evento: FormEvent) {
    evento.preventDefault(); // evita que el navegador recargue la página
    const datos: ProductoInput = {
      codigo: campos.codigo,
      nombre: campos.nombre,
      unidad: campos.unidad,
      pesoKg: campos.pesoKg.trim() === "" ? null : Number(campos.pesoKg),
    };

    if (producto) {
      actualizar.mutate(
        { id: producto.id, datos },
        {
          onSuccess: (p) => {
            toast.success(`Producto ${p.codigo} actualizado`);
            onListo();
          },
          onError: mostrarError,
        },
      );
    } else {
      crear.mutate(datos, {
        onSuccess: (p) => {
          toast.success(`Producto ${p.codigo} creado`);
          onListo();
        },
        onError: mostrarError,
      });
    }
  }

  return (
    <form onSubmit={guardar} className="grid gap-4">
      <Campo id="codigo" label="Código" error={errores.codigo}>
        <Input
          id="codigo"
          value={campos.codigo}
          onChange={(e) => cambiar("codigo", e.target.value)}
          aria-invalid={!!errores.codigo}
          placeholder="Ej. CL-50 o 7634"
          autoFocus
        />
      </Campo>

      <Campo id="nombre" label="Nombre" error={errores.nombre}>
        <Input
          id="nombre"
          value={campos.nombre}
          onChange={(e) => cambiar("nombre", e.target.value)}
          aria-invalid={!!errores.nombre}
          placeholder="Ej. Cloro granulado saco 50 lb"
        />
      </Campo>

      <div className="grid grid-cols-2 gap-4">
        <Campo id="unidad" label="Unidad" error={errores.unidad}>
          <Input
            id="unidad"
            list="unidades"
            value={campos.unidad}
            onChange={(e) => cambiar("unidad", e.target.value)}
            aria-invalid={!!errores.unidad}
          />
          <datalist id="unidades">
            {["UND", "KG", "LB", "M2", "GAL", "LT", "SACO", "CAJA"].map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
        </Campo>

        <Campo id="pesoKg" label="Peso (kg)" error={errores.pesoKg}>
          <Input
            id="pesoKg"
            type="number"
            step="0.001"
            min="0"
            inputMode="decimal"
            value={campos.pesoKg}
            onChange={(e) => cambiar("pesoKg", e.target.value)}
            aria-invalid={!!errores.pesoKg}
            placeholder="Opcional"
          />
        </Campo>
      </div>

      {errorGeneral && (
        <p role="alert" className="text-sm text-destructive">
          {errorGeneral}
        </p>
      )}

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onListo} disabled={guardando}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardando}>
          {guardando ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function Campo({
  id,
  label,
  error,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
