import { PackageIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { ProductosPage } from "@/features/productos/ProductosPage";

export default function App() {
  return (
    <div className="min-h-svh bg-muted/40">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4">
          <PackageIcon className="size-5" />
          <span className="font-semibold">StockFlow</span>
          <span className="text-sm text-muted-foreground">· Inventario</span>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <ProductosPage />
      </main>

      <Toaster theme="light" position="bottom-right" />
    </div>
  );
}
