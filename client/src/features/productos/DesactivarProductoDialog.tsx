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
import { useDesactivarProducto, type Producto } from "./productos.api";

type Props = {
  producto: Producto | null;
  onOpenChange: (open: boolean) => void;
};

// Confirmación antes del soft delete (DELETE /api/productos/:id → activo = false)
export function DesactivarProductoDialog({ producto, onOpenChange }: Props) {
  const desactivar = useDesactivarProducto();

  function confirmar() {
    if (!producto) return;
    desactivar.mutate(producto.id, {
      onSuccess: (p) => toast.success(`Producto ${p.codigo} desactivado`),
      onError: (error) => toast.error(error.message),
    });
  }

  return (
    <AlertDialog open={producto !== null} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Desactivar {producto?.codigo}?</AlertDialogTitle>
          <AlertDialogDescription>
            «{producto?.nombre}» dejará de aparecer en la lista. No se borra: su historial se
            conserva y se puede reactivar desde «Mostrar inactivos».
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction variant="destructive" onClick={confirmar}>
            Desactivar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
