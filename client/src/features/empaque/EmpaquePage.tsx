import { useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router";
import { ArrowRightIcon, SearchIcon } from "lucide-react";
import { toast } from "sonner";
import { Campo } from "@/components/Campo";
import { Encabezado } from "@/components/Encabezado";
import { aNumero, LineasProductos, lineaVacia, type LineaForm } from "@/components/LineasProductos";
import { UbicacionSelect } from "@/components/UbicacionSelect";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import { useUbicaciones } from "@/features/catalogos/catalogos.api";
import { ApiError, erroresPorCampo } from "@/lib/api";
import { formatoFecha, formatoKg } from "@/lib/formato";
import { DespachoVista } from "./DespachoVista";
import { NOMBRE_ESTADO, normalizarTra, useCrearDespacho, useDespacho, useDespachos } from "./empaque.api";

// Empaque por TRA: se escribe el número y aparecen sus artículos para empacar
export function EmpaquePage() {
  const { documento } = useParams();
  const navigate = useNavigate();
  const [tra, setTra] = useState("");

  function abrir(evento: FormEvent) {
    evento.preventDefault();
    if (tra.trim()) navigate(`/empaque/${normalizarTra(tra)}`);
    setTra("");
  }

  return (
    <section className="flex flex-col gap-4">
      <Encabezado titulo="Empaque" descripcion="Escribe el número de TRA para empacar sus artículos y controlar el peso del camión.">
        <form onSubmit={abrir} className="flex gap-2">
          <div className="relative">
            <SearchIcon className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={tra} onChange={(e) => setTra(e.target.value)} placeholder="TRA, ej. 2394" className="w-44 pl-8" aria-label="Número de TRA" />
          </div>
          <Button type="submit">Abrir</Button>
        </form>
      </Encabezado>
      {documento ? <DetalleTra documento={normalizarTra(documento)} /> : <ListaDespachos />}
    </section>
  );
}

function DetalleTra({ documento }: { documento: string }) {
  const { data, isPending, isError, error } = useDespacho(documento);
  if (isPending) return <p className="text-muted-foreground">Buscando {documento}…</p>;
  if (isError) {
    if (error instanceof ApiError && error.status === 404) return <CrearDespacho documento={documento} />;
    return <p className="text-destructive">{error.message}</p>;
  }
  return <DespachoVista despacho={data} />;
}

function ListaDespachos() {
  const navigate = useNavigate();
  const { data: despachos = [], isPending } = useDespachos();
  return (
    <div className="rounded-lg border bg-background">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>TRA</TableHead>
            <TableHead>Ruta</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">Empacado</TableHead>
            <TableHead>Creado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending ? (
            <TableRow>
              <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                Cargando…
              </TableCell>
            </TableRow>
          ) : despachos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                No hay despachos. Escribe un número de TRA arriba para crear el primero.
              </TableCell>
            </TableRow>
          ) : (
            despachos.map((d) => (
              <TableRow key={d.id} className="cursor-pointer" onClick={() => navigate(`/empaque/${d.documento}`)}>
                <TableCell className="font-medium">{d.documento}</TableCell>
                <TableCell className="text-sm">
                  <span className="inline-flex items-center gap-1">
                    {d.origen.nombre} <ArrowRightIcon className="size-3 text-muted-foreground" /> {d.destino?.nombre}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge variant={d.estado === "EMPACADO" ? "default" : "secondary"}>{NOMBRE_ESTADO[d.estado]}</Badge>
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  {formatoKg(d.resumen.pesoEmpacadoKg)} / {formatoKg(d.resumen.pesoTotalKg)}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{formatoFecha(d.creadoEn)}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// El TRA no existe todavía: se crea con sus artículos
function CrearDespacho({ documento }: { documento: string }) {
  const editable = useAuth().puede("ADMIN", "OPERADOR");
  const crear = useCrearDespacho();
  const { data: ubicaciones = [] } = useUbicaciones();
  const bodega = ubicaciones.find((u) => u.tipo === "BODEGA");
  const [origenId, setOrigenId] = useState<number | null>(null);
  const [destinoId, setDestinoId] = useState<number | null>(null);
  const [lineas, setLineas] = useState<LineaForm[]>([lineaVacia()]);
  const [errores, setErrores] = useState<Record<string, string>>({});

  if (!editable) return <p className="text-muted-foreground">No hay despacho para {documento}.</p>;

  function guardar(evento: FormEvent) {
    evento.preventDefault();
    setErrores({});
    crear.mutate(
      {
        documento,
        origenId: origenId ?? bodega?.id,
        destinoId,
        lineas: lineas.map((l) => ({ productoId: l.producto?.id ?? null, cantidad: aNumero(l.cantidad) })),
      },
      {
        onSuccess: () => toast.success(`${documento} listo para empacar`),
        onError: (error) => {
          const porCampo = erroresPorCampo(error);
          setErrores(porCampo);
          if (Object.keys(porCampo).length === 0) toast.error(error.message);
        },
      },
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{documento} todavía no está registrado</CardTitle>
        <CardDescription>Escribe los artículos del TRA. Después podrás empacarlos y despacharlos.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={guardar} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo id="origen" label="Sale de *" error={errores.origenId}>
              <UbicacionSelect id="origen" value={origenId ?? bodega?.id ?? null} onChange={setOrigenId} excluirTipos={["APARTADOS"]} excluirId={destinoId} />
            </Campo>
            <Campo id="destino" label="Destino *" error={errores.destinoId}>
              <UbicacionSelect id="destino" value={destinoId} onChange={setDestinoId} excluirTipos={["APARTADOS"]} excluirId={origenId ?? bodega?.id} invalido={!!errores.destinoId} />
            </Campo>
          </div>
          <LineasProductos lineas={lineas} onChange={setLineas} errores={errores} />
          <div className="flex justify-end">
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending ? "Creando…" : "Crear y empezar a empacar"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
