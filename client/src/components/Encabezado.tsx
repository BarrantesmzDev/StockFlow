import type { ReactNode } from "react";

// Título de cada pantalla con su descripción y botones a la derecha
export function Encabezado({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
