import { NavLink, Outlet } from "react-router";
import { LogOutIcon, PackageIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOMBRE_ROL, type Rol } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/auth-context";

const MENU: { ruta: string; texto: string; roles?: Rol[] }[] = [
  { ruta: "/", texto: "Inventario" },
  { ruta: "/movimientos", texto: "Movimientos" },
  { ruta: "/apartados", texto: "Apartados" },
  { ruta: "/empaque", texto: "Empaque" },
  { ruta: "/productos", texto: "Productos" },
  { ruta: "/importar", texto: "Importar", roles: ["ADMIN"] },
  { ruta: "/usuarios", texto: "Usuarios", roles: ["ADMIN"] },
];

export function AppLayout() {
  const { usuario, puede, cerrarSesion } = useAuth();
  const opciones = MENU.filter((m) => !m.roles || puede(...m.roles));

  return (
    <div className="min-h-svh bg-muted/40">
      <header className="sticky top-0 z-30 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
          <NavLink to="/" className="flex shrink-0 items-center gap-2">
            <PackageIcon className="size-5" />
            <span className="font-semibold">StockFlow</span>
          </NavLink>
          {/* En pantallas grandes el menú va en la misma barra */}
          <nav className="hidden flex-1 items-center gap-1 md:flex">
            {opciones.map((m) => (
              <EnlaceMenu key={m.ruta} ruta={m.ruta} texto={m.texto} />
            ))}
          </nav>
          <div className="ml-auto md:ml-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <UserIcon />
                  <span className="max-w-32 truncate">{usuario?.nombre}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <div className="font-medium">{usuario?.nombre}</div>
                  <div className="text-xs font-normal text-muted-foreground">
                    {usuario?.email} · {usuario && NOMBRE_ROL[usuario.rol]}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => void cerrarSesion()}>
                  <LogOutIcon />
                  Cerrar sesión
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        {/* En celular el menú va debajo, con scroll horizontal */}
        <nav className="flex gap-1 overflow-x-auto border-t px-4 py-1.5 md:hidden">
          {opciones.map((m) => (
            <EnlaceMenu key={m.ruta} ruta={m.ruta} texto={m.texto} />
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

function EnlaceMenu({ ruta, texto }: { ruta: string; texto: string }) {
  return (
    <NavLink
      to={ruta}
      end={ruta === "/"}
      className={({ isActive }) =>
        `shrink-0 rounded-md px-2.5 py-1.5 text-sm transition-colors ${
          isActive ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:text-foreground"
        }`
      }
    >
      {texto}
    </NavLink>
  );
}
