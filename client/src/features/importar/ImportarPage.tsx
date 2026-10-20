import { useMemo, useState } from "react";
import { Link } from "react-router";
import { CheckCircle2Icon } from "lucide-react";
import { toast } from "sonner";
import { Campo } from "@/components/Campo";
import { Encabezado } from "@/components/Encabezado";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUbicaciones, type Ubicacion } from "@/features/catalogos/catalogos.api";
import { formatoNumero, hoyISO } from "@/lib/formato";
import { ColumnaSelect } from "./ColumnaSelect";
import { ElegirArchivo } from "./ElegirArchivo";
import { buscarColumna, columnasDe, detectarFilaEncabezado, letraColumna, useLeerArchivo, type Hoja } from "./hojas";
import {
  useConfirmarImportacion,
  usePrevisualizar,
  type AccionFila,
  type MapeoProductos,
  type ResultadoImportacion,
  type VistaPrevia,
} from "./importar.api";

type Paso = "archivo" | "mapeo" | "vista" | "resultado";

const sinTildes = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toUpperCase().trim();

// Asistente: 1) archivo  2) hoja y columnas  3) revisar fila por fila  4) resultado
export function ImportarPage() {
  const { data: ubicaciones = [] } = useUbicaciones();
  const leer = useLeerArchivo();
  const previsualizar = usePrevisualizar();
  const confirmar = useConfirmarImportacion();

  const [paso, setPaso] = useState<Paso>("archivo");
  const [archivo, setArchivo] = useState<string>();
  const [hojas, setHojas] = useState<Hoja[]>([]);
  const [hojaNombre, setHojaNombre] = useState<string>();
  const [filaEncabezado, setFilaEncabezado] = useState(1);
  const [columnas, setColumnas] = useState<MapeoProductos["columnas"]>({ codigo: -1, nombre: -1 });
  const [stock, setStock] = useState<Record<number, number | undefined>>({});
  const [sugerirPesos, setSugerirPesos] = useState(true);
  const [sugerirUnidades, setSugerirUnidades] = useState(true);
  const [reemplazarStock, setReemplazarStock] = useState(false);
  const [fechaCorte, setFechaCorte] = useState(hoyISO());
  const [vista, setVista] = useState<VistaPrevia>();
  const [resultado, setResultado] = useState<ResultadoImportacion>();

  const hoja = hojas.find((h) => h.nombre === hojaNombre);
  const cols = useMemo(() => (hoja ? columnasDe(hoja.filas, filaEncabezado) : []), [hoja, filaEncabezado]);

  // Al elegir hoja/fila se adivina el mapeo por los títulos de las columnas
  function elegirHoja(h: Hoja, fila = detectarFilaEncabezado(h.filas)) {
    setHojaNombre(h.nombre);
    setFilaEncabezado(fila);
    const c = columnasDe(h.filas, fila);
    setColumnas({
      codigo: buscarColumna(c, /^c[oó]digo$/i, /c[oó]d/i) ?? -1,
      nombre: buscarColumna(c, /^productos?$/i, /^nombre$/i, /art[ií]culo|descrip|producto|nombre/i) ?? -1,
      unidad: buscarColumna(c, /^unidad$/i, /^u\.?m\.?$/i),
      pesoKg: buscarColumna(c, /^peso/i, /^kg$/i),
    });
    // Stock: la bodega principal ← "STOCK"/"EXISTENCIA"; cada ubicación ← columna con su mismo nombre,
    // salvo las sucursales: en el Excel actual esas columnas son lo ENVIADO, no su stock real
    const sugerido: Record<number, number | undefined> = {};
    const principal = ubicaciones.find((u) => u.tipo === "BODEGA");
    if (principal) sugerido[principal.id] = buscarColumna(c, /^stock$/i, /existencia|disponible/i);
    for (const u of ubicaciones.filter((u) => u.tipo === "APARTADOS")) {
      sugerido[u.id] = c.find((col) => sinTildes(col.encabezado) === sinTildes(u.nombre))?.indice;
    }
    setStock(sugerido);
  }

  function alElegirArchivo(file: File) {
    setArchivo(file.name);
    leer.mutate(file, {
      onSuccess: ({ hojas }) => {
        setHojas(hojas);
        // Preferir una hoja llamada INVENTARIO/PRODUCTOS/CATALOGO; si no, la de más filas
        const preferida =
          hojas.find((h) => /inventario|producto|cat[aá]logo/i.test(h.nombre)) ??
          [...hojas].sort((a, b) => b.filas.length - a.filas.length)[0];
        elegirHoja(preferida);
        setPaso("mapeo");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function mapeo(): MapeoProductos {
    return {
      filaInicio: filaEncabezado + 1,
      filas: hoja!.filas.slice(filaEncabezado),
      columnas: {
        codigo: columnas.codigo,
        nombre: columnas.nombre,
        unidad: columnas.unidad,
        pesoKg: columnas.pesoKg,
      },
      stock: Object.entries(stock)
        .filter(([, columna]) => columna !== undefined)
        .map(([ubicacionId, columna]) => ({ ubicacionId: Number(ubicacionId), columna: columna! })),
      sugerirPesos,
      sugerirUnidades,
      reemplazarStock,
    };
  }

  function revisar() {
    previsualizar.mutate(mapeo(), {
      onSuccess: (v) => {
        setVista(v);
        setPaso("vista");
      },
      onError: (e) => toast.error(e.message),
    });
  }

  function importar() {
    confirmar.mutate(
      { ...mapeo(), fechaCorte: new Date(`${fechaCorte}T12:00:00`).toISOString() },
      {
        onSuccess: (r) => {
          setResultado(r);
          setPaso("resultado");
        },
        onError: (e) => toast.error(e.message),
      },
    );
  }

  function reiniciar() {
    setPaso("archivo");
    setArchivo(undefined);
    setHojas([]);
    setVista(undefined);
    setResultado(undefined);
  }

  return (
    <section className="flex flex-col gap-4">
      <Encabezado titulo="Importar catálogo" descripcion="Productos y saldo inicial desde un Excel (.xlsx) o CSV." />
      <Pasos actual={paso} />

      {paso === "archivo" && (
        <Card>
          <CardHeader>
            <CardTitle>1. Elige el archivo</CardTitle>
            <CardDescription>
              Debe tener una fila de títulos (por ejemplo CODIGO, PRODUCTOS, STOCK). Si importas un archivo que ya importaste, no se
              duplica nada: los productos se actualizan y el stock queda en lo que dice el archivo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ElegirArchivo onElegir={alElegirArchivo} cargando={leer.isPending} nombreActual={archivo} />
          </CardContent>
        </Card>
      )}

      {paso === "mapeo" && hoja && (
        <Card>
          <CardHeader>
            <CardTitle>2. Hoja y columnas</CardTitle>
            <CardDescription>{archivo}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <Campo label="Hoja">
                <Select value={hojaNombre} onValueChange={(v) => elegirHoja(hojas.find((h) => h.nombre === v)!)}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {hojas.map((h) => (
                      <SelectItem key={h.nombre} value={h.nombre}>
                        {h.nombre} ({h.filas.length} filas)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Campo>
              <Campo label="Fila de títulos">
                <Input type="number" min={1} className="w-28" value={filaEncabezado} onChange={(e) => elegirHoja(hoja, Math.max(1, Number(e.target.value) || 1))} />
              </Campo>
            </div>

            <MuestraHoja hoja={hoja} filaEncabezado={filaEncabezado} />

            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label="Código *">
                <ColumnaSelect columnas={cols} value={columnas.codigo < 0 ? undefined : columnas.codigo} onChange={(v) => setColumnas({ ...columnas, codigo: v ?? -1 })} permitirNinguna={false} />
              </Campo>
              <Campo label="Nombre *">
                <ColumnaSelect columnas={cols} value={columnas.nombre < 0 ? undefined : columnas.nombre} onChange={(v) => setColumnas({ ...columnas, nombre: v ?? -1 })} permitirNinguna={false} />
              </Campo>
              <Campo label="Unidad" ayuda="Si no hay, se usa UND (o se sugiere desde el nombre).">
                <ColumnaSelect columnas={cols} value={columnas.unidad} onChange={(v) => setColumnas({ ...columnas, unidad: v })} />
              </Campo>
              <Campo label="Peso (kg)" ayuda="Si no hay, se sugiere desde el nombre (ej. «Saco 50Lbs»).">
                <ColumnaSelect columnas={cols} value={columnas.pesoKg} onChange={(v) => setColumnas({ ...columnas, pesoKg: v })} />
              </Campo>
            </div>

            <div className="grid gap-3">
              <div>
                <h3 className="font-medium">Stock inicial por ubicación</h3>
                <p className="text-sm text-muted-foreground">
                  Las ubicaciones sin columna quedan en 0. En el Excel actual, las columnas MONTE NEGRO y SANTA ANA son lo que se les
                  <strong> envió</strong>, no su stock real: déjalas en 0 hasta hacer un conteo físico.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {ubicaciones.map((u: Ubicacion) => (
                  <Campo key={u.id} label={u.nombre}>
                    <ColumnaSelect columnas={cols} value={stock[u.id]} onChange={(v) => setStock({ ...stock, [u.id]: v })} textoNinguna="— Queda en 0 —" />
                  </Campo>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
              <Campo label="Fecha de corte" ayuda="Fecha del saldo inicial.">
                <Input type="date" className="w-44" value={fechaCorte} max={hoyISO()} onChange={(e) => setFechaCorte(e.target.value)} />
              </Campo>
              <Casilla texto="Sugerir pesos desde el nombre" valor={sugerirPesos} onChange={setSugerirPesos} />
              <Casilla texto="Sugerir unidades desde el nombre" valor={sugerirUnidades} onChange={setSugerirUnidades} />
            </div>
            <label className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <input type="checkbox" checked={reemplazarStock} onChange={(e) => setReemplazarStock(e.target.checked)} className="mt-0.5 size-4 accent-primary" />
              <span>
                <strong>Reemplazar el stock de los productos que ya existen.</strong> Normalmente NO: un producto existente solo actualiza su
                nombre, y su stock queda como está. Márcalo solo para corregir un saldo inicial mal cargado; si ya registraste movimientos,
                se perderían.
              </span>
            </label>

            <div className="flex justify-between gap-2">
              <Button variant="outline" onClick={reiniciar}>
                Otro archivo
              </Button>
              <Button onClick={revisar} disabled={columnas.codigo < 0 || columnas.nombre < 0 || previsualizar.isPending}>
                {previsualizar.isPending ? "Revisando…" : "Revisar filas"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {paso === "vista" && vista && (
        <RevisionFilas
          vista={vista}
          ubicaciones={ubicaciones}
          importando={confirmar.isPending}
          onVolver={() => setPaso("mapeo")}
          onImportar={importar}
        />
      )}

      {paso === "resultado" && resultado && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2Icon className="size-5 text-emerald-600" /> Importación terminada
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4">
            <ul className="grid gap-1 text-sm">
              <li>
                <strong>{resultado.productosCreados}</strong> productos creados · <strong>{resultado.productosActualizados}</strong> actualizados
              </li>
              <li>
                <strong>{resultado.ajustesDeStock}</strong> ajustes de stock (saldo inicial) · <strong>{resultado.apartadosCreados}</strong> apartados sin cliente
              </li>
              <li>
                {resultado.omitidas} filas omitidas (repetidas) · {resultado.conError} con error (no se importaron)
              </li>
            </ul>
            {resultado.advertencias.length > 0 && (
              <div className="rounded-md bg-amber-50 p-3 text-sm text-amber-900">{resultado.advertencias.join(" · ")}</div>
            )}
            <div className="flex flex-wrap gap-2">
              <Button asChild>
                <Link to="/">Ver inventario</Link>
              </Button>
              <Button variant="outline" onClick={reiniciar}>
                Importar otro archivo
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
}

function Pasos({ actual }: { actual: Paso }) {
  const pasos: [Paso, string][] = [
    ["archivo", "Archivo"],
    ["mapeo", "Columnas"],
    ["vista", "Revisión"],
    ["resultado", "Listo"],
  ];
  const indice = pasos.findIndex(([p]) => p === actual);
  return (
    <ol className="flex flex-wrap gap-2 text-sm">
      {pasos.map(([p, texto], i) => (
        <li key={p} className={`rounded-full px-3 py-1 ${i === indice ? "bg-primary text-primary-foreground" : i < indice ? "bg-muted" : "text-muted-foreground"}`}>
          {i + 1}. {texto}
        </li>
      ))}
    </ol>
  );
}

// Las primeras filas desde los títulos, para confirmar que se eligió bien la hoja y la fila
function MuestraHoja({ hoja, filaEncabezado }: { hoja: Hoja; filaEncabezado: number }) {
  const filas = hoja.filas.slice(filaEncabezado - 1, filaEncabezado + 5);
  const ancho = Math.min(12, Math.max(...filas.map((f) => f.length), 1));
  return (
    <div className="min-w-0 rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-xs">Fila</TableHead>
            {Array.from({ length: ancho }, (_, i) => (
              <TableHead key={i} className="text-xs">
                {letraColumna(i)}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {filas.map((fila, i) => (
            <TableRow key={i} className={i === 0 ? "bg-muted/60 font-medium" : ""}>
              <TableCell className="text-xs text-muted-foreground">{filaEncabezado + i}</TableCell>
              {Array.from({ length: ancho }, (_, c) => (
                <TableCell key={c} className="max-w-48 truncate text-xs">
                  {/* Excel guarda 376.75 como 376.7500000000002: se muestra redondeado */}
                  {typeof fila[c] === "number" ? String(Number((fila[c] as number).toFixed(4))) : String(fila[c] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

const COLOR_ACCION: Record<AccionFila, string> = {
  crear: "border-emerald-200 bg-emerald-50 text-emerald-800",
  actualizar: "border-sky-200 bg-sky-50 text-sky-800",
  omitir: "border-zinc-200 bg-zinc-50 text-zinc-600",
  error: "border-red-200 bg-red-50 text-red-700",
};

function RevisionFilas({
  vista,
  ubicaciones,
  importando,
  onVolver,
  onImportar,
}: {
  vista: VistaPrevia;
  ubicaciones: Ubicacion[];
  importando: boolean;
  onVolver: () => void;
  onImportar: () => void;
}) {
  const [filtro, setFiltro] = useState<"todas" | "error" | "advertencias" | "omitir">("todas");
  const { resumen } = vista;
  const aImportar = resumen.crear + resumen.actualizar;
  const filtradas = vista.filas.filter((f) =>
    filtro === "todas" ? true : filtro === "advertencias" ? f.advertencias.length > 0 : f.accion === filtro,
  );
  const ubicacionesConStock = ubicaciones.filter((u) => vista.filas[0]?.stock.some((s) => s.ubicacionId === u.id));
  const MAX = 300;

  return (
    <Card>
      <CardHeader>
        <CardTitle>3. Revisa antes de importar</CardTitle>
        <CardDescription>Nada se guarda hasta que confirmes. Las filas con error no se importan.</CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-4">
        <div className="flex flex-wrap gap-2 text-sm">
          <Badge variant="outline" className={COLOR_ACCION.crear}>{resumen.crear} nuevos</Badge>
          <Badge variant="outline" className={COLOR_ACCION.actualizar}>{resumen.actualizar} se actualizan</Badge>
          <Badge variant="outline" className={COLOR_ACCION.omitir}>{resumen.omitir} omitidos</Badge>
          <Badge variant="outline" className={COLOR_ACCION.error}>{resumen.error} con error</Badge>
          <Badge variant="outline">{resumen.conAdvertencias} con advertencias</Badge>
        </div>
        <Tabs value={filtro} onValueChange={(v) => setFiltro(v as typeof filtro)}>
          <TabsList>
            <TabsTrigger value="todas">Todas</TabsTrigger>
            <TabsTrigger value="error">Errores</TabsTrigger>
            <TabsTrigger value="advertencias">Advertencias</TabsTrigger>
            <TabsTrigger value="omitir">Omitidas</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="max-h-[60svh] overflow-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14">Fila</TableHead>
                <TableHead className="w-24">Acción</TableHead>
                <TableHead>Código</TableHead>
                <TableHead className="min-w-56">Nombre</TableHead>
                <TableHead>Unidad</TableHead>
                <TableHead className="text-right">Peso kg</TableHead>
                {ubicacionesConStock.map((u) => (
                  <TableHead key={u.id} className="text-right">
                    {u.nombre}
                  </TableHead>
                ))}
                <TableHead className="min-w-64">Mensajes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtradas.slice(0, MAX).map((f) => (
                <TableRow key={f.fila}>
                  <TableCell className="text-xs text-muted-foreground">{f.fila}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={COLOR_ACCION[f.accion]}>{f.accion}</Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{f.codigo}</TableCell>
                  <TableCell className="whitespace-normal text-sm">{f.nombre}</TableCell>
                  <TableCell className="text-sm">{f.unidad}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">{f.pesoKg === null ? "—" : formatoNumero(f.pesoKg)}</TableCell>
                  {ubicacionesConStock.map((u) => (
                    <TableCell key={u.id} className="text-right text-sm tabular-nums">
                      {f.stockSeImporta ? (
                        formatoNumero(f.stock.find((s) => s.ubicacionId === u.id)?.cantidad ?? 0)
                      ) : (
                        <span className="text-xs text-muted-foreground" title="Producto existente: su stock no cambia">no cambia</span>
                      )}
                    </TableCell>
                  ))}
                  <TableCell className="whitespace-normal text-xs">
                    {f.errores.map((e) => (
                      <div key={e} className="text-destructive">{e}</div>
                    ))}
                    {f.advertencias.map((a) => (
                      <div key={a} className="text-amber-700">{a}</div>
                    ))}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        {filtradas.length > MAX && <p className="text-xs text-muted-foreground">Se muestran las primeras {MAX} de {filtradas.length} filas.</p>}
        <div className="flex justify-between gap-2">
          <Button variant="outline" onClick={onVolver}>
            Volver a columnas
          </Button>
          <Button onClick={onImportar} disabled={aImportar === 0 || importando}>
            {importando ? "Importando…" : `Importar ${aImportar} productos`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Casilla({ texto, valor, onChange }: { texto: string; valor: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 pb-2 text-sm">
      <input type="checkbox" checked={valor} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" />
      {texto}
    </label>
  );
}
