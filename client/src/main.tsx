import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ApiError } from "./lib/api";
import "./index.css";
import App from "./App.tsx";

// TanStack Query guarda en caché las respuestas de la API y las vuelve a pedir cuando hace falta
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Reintentar solo si el problema fue de red o del servidor (no un 400/401/403/404)
      retry: (intentos, error) => intentos < 2 && (!(error instanceof ApiError) || error.status === 0 || error.status >= 500),
    },
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </BrowserRouter>
  </StrictMode>,
);
