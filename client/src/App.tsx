import type { ReactNode } from "react";
import { Link, Route, Routes } from "react-router";
import { Loader2Icon } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Toaster } from "@/components/ui/sonner";
import { ApartadosPage } from "@/features/apartados/ApartadosPage";
import type { Rol } from "@/features/auth/auth.api";
import { AccesoPage } from "@/features/auth/AccesoPage";
import { useAuth } from "@/features/auth/auth-context";
import { AuthProvider } from "@/features/auth/AuthProvider";
import { EmpaquePage } from "@/features/empaque/EmpaquePage";
import { ImportarPage } from "@/features/importar/ImportarPage";
import { InventarioPage } from "@/features/inventario/InventarioPage";
import { MovimientosPage } from "@/features/movimientos/MovimientosPage";
import { ProductosPage } from "@/features/productos/ProductosPage";
import { UsuariosPage } from "@/features/usuarios/UsuariosPage";

export default function App() {
  return (
    <AuthProvider>
      <Rutas />
      <Toaster theme="light" position="bottom-right" />
    </AuthProvider>
  );
}

function Rutas() {
  const { estado } = useAuth();

  if (estado === "cargando") {
    // El plan gratis de Render apaga la API sin uso: la primera visita puede tardar ~1 minuto
    return (
      <div className="flex min-h-svh flex-col items-center justify-center gap-2 px-4 text-center text-muted-foreground">
        <Loader2Icon className="size-6 animate-spin" />
        <p>Conectando con el servidor…</p>
        <p className="text-xs">Si estuvo inactivo, puede tardar hasta un minuto en despertar.</p>
      </div>
    );
  }
  if (estado !== "autenticado") return <AccesoPage />;

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<InventarioPage />} />
        <Route path="movimientos" element={<MovimientosPage />} />
        <Route path="apartados" element={<ApartadosPage />} />
        <Route path="empaque" element={<EmpaquePage />} />
        <Route path="empaque/:documento" element={<EmpaquePage />} />
        <Route path="productos" element={<ProductosPage />} />
        <Route path="importar" element={<SoloRoles roles={["ADMIN"]}><ImportarPage /></SoloRoles>} />
        <Route path="usuarios" element={<SoloRoles roles={["ADMIN"]}><UsuariosPage /></SoloRoles>} />
        <Route path="*" element={<Mensaje texto="Esta página no existe." />} />
      </Route>
    </Routes>
  );
}

// Protección en el frontend (comodidad). La protección real la hace la API con requiereRol.
function SoloRoles({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { puede } = useAuth();
  return puede(...roles) ? children : <Mensaje texto="No tienes permiso para ver esta página." />;
}

function Mensaje({ texto }: { texto: string }) {
  return (
    <div className="py-16 text-center text-muted-foreground">
      <p>{texto}</p>
      <Link to="/" className="text-sm text-foreground underline underline-offset-4">
        Ir al inventario
      </Link>
    </div>
  );
}
