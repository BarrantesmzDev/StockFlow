import { useState } from "react";
import { CheckIcon, ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProductos, type Producto } from "@/features/productos/productos.api";
import { useDebounce } from "@/hooks/use-debounce";

type Props = {
  value: Producto | null;
  onChange: (producto: Producto) => void;
  invalido?: boolean;
};

// Buscador de productos: escribe código o nombre y elige de la lista.
// La búsqueda la hace la API (no se cargan los 800 productos en el navegador).
export function ProductoPicker({ value, onChange, invalido }: Props) {
  const [abierto, setAbierto] = useState(false);
  const [buscar, setBuscar] = useState("");
  const buscarDebounced = useDebounce(buscar, 250);
  const { data: productos = [], isFetching } = useProductos({
    buscar: buscarDebounced,
    incluirInactivos: false,
  });

  return (
    <Popover open={abierto} onOpenChange={setAbierto}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={abierto}
          aria-invalid={invalido}
          className="w-full justify-between overflow-hidden font-normal"
        >
          <span className="min-w-0 truncate">
            {value ? (
              <>
                <span className="font-mono text-xs">{value.codigo}</span> · {value.nombre}
              </>
            ) : (
              <span className="text-muted-foreground">Buscar producto…</span>
            )}
          </span>
          <ChevronsUpDownIcon className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(32rem,calc(100vw-2rem))] p-0" align="start">
        {/* shouldFilter=false: el filtro lo hace la API, no cmdk */}
        <Command shouldFilter={false}>
          <CommandInput placeholder="Código o nombre…" value={buscar} onValueChange={setBuscar} />
          <CommandList>
            <CommandEmpty>{isFetching ? "Buscando…" : "Ningún producto coincide."}</CommandEmpty>
            <CommandGroup>
              {productos.slice(0, 50).map((producto) => (
                <CommandItem
                  key={producto.id}
                  value={String(producto.id)}
                  onSelect={() => {
                    onChange(producto);
                    setAbierto(false);
                  }}
                >
                  <CheckIcon className={value?.id === producto.id ? "opacity-100" : "opacity-0"} />
                  <span className="w-24 shrink-0 font-mono text-xs">{producto.codigo}</span>
                  <span className="min-w-0 truncate">{producto.nombre}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
