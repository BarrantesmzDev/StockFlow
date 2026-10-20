import { useState, type FormEvent } from "react";
import { PackageIcon } from "lucide-react";
import { Campo } from "@/components/Campo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { erroresPorCampo } from "@/lib/api";
import { useAuth } from "./auth-context";

// Login, o "crear el primer administrador" si la instalación es nueva
export function AccesoPage() {
  const { estado, iniciarSesion, configurar } = useAuth();
  const esConfiguracion = estado === "configurar";

  const [nombre, setNombre] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errores, setErrores] = useState<Record<string, string>>({});
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setErrores({});
    setErrorGeneral(null);
    try {
      if (esConfiguracion) await configurar(nombre, email, password);
      else await iniciarSesion(email, password);
    } catch (error) {
      const porCampo = erroresPorCampo(error);
      setErrores(porCampo);
      if (Object.keys(porCampo).length === 0) setErrorGeneral((error as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-muted/40 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-2 flex items-center gap-2">
            <PackageIcon className="size-5" />
            <span className="font-semibold">StockFlow</span>
          </div>
          <CardTitle>{esConfiguracion ? "Crear administrador" : "Iniciar sesión"}</CardTitle>
          <CardDescription>
            {esConfiguracion
              ? "Instalación nueva: esta cuenta podrá crear al resto de usuarios."
              : "Inventario de la empresa."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={enviar} className="grid gap-4">
            {esConfiguracion && (
              <Campo id="nombre" label="Nombre" error={errores.nombre}>
                <Input id="nombre" value={nombre} onChange={(e) => setNombre(e.target.value)} autoFocus />
              </Campo>
            )}
            <Campo id="email" label="Correo" error={errores.email}>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus={!esConfiguracion}
              />
            </Campo>
            <Campo
              id="password"
              label="Contraseña"
              error={errores.password}
              ayuda={esConfiguracion ? "Mínimo 8 caracteres." : undefined}
            >
              <Input
                id="password"
                type="password"
                autoComplete={esConfiguracion ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Campo>
            {errorGeneral && (
              <p role="alert" className="text-sm text-destructive">
                {errorGeneral}
              </p>
            )}
            <Button type="submit" disabled={enviando}>
              {enviando ? "Un momento…" : esConfiguracion ? "Crear y entrar" : "Entrar"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
