# StockFlow

Sistema de inventario web: importación de Excel/CSV, entradas, ventas, traslados
entre sucursales, apartados, empaque por número de traslado y control de peso
en cargas de camión.

Pensado para instalarse una vez por empresa (self-hosted) y reemplazar el control
de inventario en Excel. Licencia MIT.

## Stack

- **Frontend:** React 19 + Vite + TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query
- **Backend:** Node.js 24 + Express 5 + TypeScript, validación con Zod 4
- **Base de datos:** PostgreSQL (Neon) + Prisma 7
- **Deploy:** Vercel (frontend), Render (API), Neon (base de datos)

## Estructura

```
client/   Frontend (React). src/features/<módulo>/ agrupa pantalla + llamadas a la API
server/   API REST (Express)
  prisma/        schema.prisma, migraciones y seed
  src/modules/   un módulo por funcionalidad: schema (Zod) → service (Prisma) → routes (HTTP)
  src/lib/       conexión a Prisma, errores HTTP, configuración de Zod
render.yaml  Blueprint para desplegar la API en Render
```

## Desarrollo local

Requisitos: Node 24 y una base PostgreSQL (por ejemplo, un proyecto gratuito en Neon).

```bash
git clone https://github.com/BarrantesmzDev/StockFlow.git
cd StockFlow

# Backend
cd server
npm install
cp .env.example .env   # luego pon tu DATABASE_URL en .env
npm run db:migrate     # crea las tablas
npm run db:seed        # ubicaciones y camión iniciales
npm run dev            # http://localhost:3000

# Frontend (en otra terminal)
cd client
npm install
npm run dev            # http://localhost:5173 (reenvía /api a localhost:3000)
```

Con `LOG_SQL=true` en `server/.env`, la API imprime cada consulta SQL que genera Prisma.

## API

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado de la API |
| GET | `/api/productos?buscar=&incluirInactivos=true` | Lista y búsqueda por código o nombre |
| GET | `/api/productos/:id` | Un producto |
| POST | `/api/productos` | Crear (409 si el código ya existe) |
| PATCH | `/api/productos/:id` | Editar solo los campos enviados |
| DELETE | `/api/productos/:id` | Desactivar (soft delete; se conserva el historial) |

Errores en JSON: `{ "error": "...", "detalles": [{ "campo": "...", "mensaje": "..." }] }`.

## Deploy

1. **API en Render:** New → Blueprint → este repositorio (usa `render.yaml`).
   Variables: `DATABASE_URL` (Neon) y `CORS_ORIGIN` (URL del frontend).
2. **Frontend en Vercel:** importar el repositorio con *Root Directory* = `client`.
   Variable: `VITE_API_URL` = URL de la API en Render.

## Estado

- [x] Catálogo de productos (API + pantalla)
- [ ] Importación de Excel/CSV
- [ ] Movimientos: entradas, ventas, devoluciones, traslados, ajustes
- [ ] Apartados
- [ ] Empaque por TRA con control de peso del camión
- [ ] Inventario por ubicación y conciliación con el sistema oficial
- [ ] Usuarios y roles
