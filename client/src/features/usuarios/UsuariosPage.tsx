import { useState, type FormEvent } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { Campo } from "@/components/Campo";
import { Encabezado } from "@/components/Encabezado";
import { Badge } from "@/components/ui/badge";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NOMBRE_ROL, type Rol } from "@/features/auth/auth.api";
import { useAuth } from "@/features/auth/auth-context";
import { erroresPorCampo } from "@/lib/api";
import { formatoFechaHora } from "@/lib/formato";
import { useGuardarUsuario, useUsuarios, type UsuarioAdmin } from "./usuarios.api";

const DESCRIPCION_ROL: Record<Rol, string> = {
  ADMIN: "Todo, incluidos usuarios, importaciones y SistemaCR",
  OPERADOR: "Movimientos, apartados, empaque y productos",
  CONSULTA: "Solo puede ver",
};

export function UsuariosPage() {
  const { usuario: yo } = useAuth();
  const { data: usuarios = [], isPending } = useUsuarios();
  const [editando, setEditando] = useState<UsuarioAdmin | "nuevo" | null>(null);

  return (
    <section className="flex flex-col gap-4">
      <Encabezado titulo="Usuarios" descripcion="Quién puede entrar a StockFlow y qué puede hacer.">
        <Button onClick={() => setEditando("nuevo")}>
          <PlusIcon />
          Nuevo usuario
        </Button>
      </Encabezado>
      <div className="rounded-lg border bg-background">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Correo</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Último acceso</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                  Cargando…
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((u) => (
                <TableRow key={u.id} className={u.activo ? "" : "opacity-60"}>
                  <TableCell>
                    {u.nombre} {u.id === yo?.id && <span className="text-xs text-muted-foreground">(tú)</span>}
                  </TableCell>
                  <TableCell className="text-sm">{u.email}</TableCell>
                  <TableCell>{NOMBRE_ROL[u.rol]}</TableCell>
                  <TableCell>{u.activo ? <Badge variant="secondary">Activo</Badge> : <Badge variant="outline">Inactivo</Badge>}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{formatoFechaHora(u.ultimoAccesoEn)}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon-sm" aria-label={`Editar ${u.nombre}`} onClick={() => setEditando(u)}>
                      <PencilIcon />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      <Dialog open={editando !== null} onOpenChange={(v) => !v && setEditando(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editando === "nuevo" ? "Nuevo usuario" : `Editar ${editando?.nombre}`}</DialogTitle>
            <DialogDescription>
              {editando === "nuevo"
                ? "Comparte la contraseña inicial con la persona por un medio seguro."
                : "Deja la contraseña vacía para no cambiarla. Si la cambias o lo desactivas, se cierran sus sesiones."}
            </DialogDescription>
          </DialogHeader>
          {editando && <FormularioUsuario usuario={editando === "nuevo" ? null : editando} onListo={() => setEditando(null)} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function FormularioUsuario({ usuario, onListo }: { usuario: UsuarioAdmin | null; onListo: () => void }) {
  const guardar = useGuardarUsuario();
  const [nombre, setNombre] = useState(usuario?.nombre ?? "");
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState<Rol>(usuario?.rol ?? "OPERADOR");
  const [activo, setActivo] = useState(usuario?.activo ?? true);
  const [errores, setErrores] = useState<Record<string, string>>({});

  function enviar(evento: FormEvent) {
    evento.preventDefault();
    setErrores({});
    const datos = usuario
      ? { id: usuario.id, nombre, rol, activo, password: password || undefined }
      : { nombre, email, password, rol };
    guardar.mutate(datos, {
      onSuccess: (u) => {
        toast.success(usuario ? `${u.nombre} actualizado` : `Usuario ${u.email} creado`);
        onListo();
      },
      onError: (error) => {
        const porCampo = erroresPorCampo(error);
        setErrores(porCampo);
        if (Object.keys(porCampo).length === 0) toast.error(error.message);
      },
    });
  }

  return (
    <form onSubmit={enviar} className="grid gap-4">
      <Campo id="nombre" label="Nombre" error={errores.nombre}>
        <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
      </Campo>
      {!usuario && (
        <Campo id="email" label="Correo" error={errores.email}>
          <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
      )}
      <Campo id="password" label={usuario ? "Nueva contraseña" : "Contraseña inicial"} error={errores.password} ayuda="Mínimo 8 caracteres.">
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      </Campo>
      <Campo id="rol" label="Rol" ayuda={DESCRIPCION_ROL[rol]}>
        <Select value={rol} onValueChange={(v) => setRol(v as Rol)}>
          <SelectTrigger id="rol" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(NOMBRE_ROL) as Rol[]).map((r) => (
              <SelectItem key={r} value={r}>
                {NOMBRE_ROL[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Campo>
      {usuario && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} className="size-4 accent-primary" />
          Usuario activo (puede iniciar sesión)
        </label>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onListo}>
          Cancelar
        </Button>
        <Button type="submit" disabled={guardar.isPending}>
          {guardar.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </DialogFooter>
    </form>
  );
}
