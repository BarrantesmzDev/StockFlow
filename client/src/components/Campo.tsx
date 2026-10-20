import type { ReactNode } from "react";
import { Label } from "@/components/ui/label";

// Etiqueta + input + mensaje de error debajo, igual en todos los formularios
export function Campo({
  id,
  label,
  error,
  ayuda,
  children,
  className,
}: {
  id?: string;
  label: string;
  error?: string;
  ayuda?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`grid gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error ? (
        <p className="text-xs text-destructive">{error}</p>
      ) : ayuda ? (
        <p className="text-xs text-muted-foreground">{ayuda}</p>
      ) : null}
    </div>
  );
}
