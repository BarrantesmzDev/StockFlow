# StockFlow

Sistema de inventario web para reemplazar el control de inventario en Excel: catálogo,
entradas, ventas, devoluciones, traslados internos (TRA), apartados, empaque por TRA con
control de peso del camión y conciliación contra el sistema oficial (SistemaCR).

Pensado para instalarse una vez por empresa (self-hosted). Licencia MIT.

## Funcionalidades

| Módulo | Qué hace |
|---|---|
| **Inventario** | Stock por ubicación, total y diferencia contra la última exportación de SistemaCR. Descarga en CSV. |
| **Movimientos** | Entrada, venta (con factura), devolución (con nota de crédito), traslado interno con número de TRA y ajuste por conteo físico. Serie y EP (código de garantía) por línea. Todas las líneas en una sola transacción. |
| **Apartados** | Apartar mercadería para un cliente, entregarla con factura o cancelarla (vuelve a su origen). |
| **Empaque** | Se escribe el TRA, aparecen sus artículos pendientes y empacados, y el peso se suma contra la capacidad del camión. Al despachar se mueve el stock. |
| **Importar** | Asistente para cargar catálogo y saldo inicial desde `.xlsx` o `.csv`: mapeo de columnas, vista previa fila por fila con validación y confirmación en una transacción. |
| **Usuarios** | Roles ADMIN (todo), OPERADOR (operación diaria) y CONSULTA (solo lectura). |

Reglas que garantiza el sistema:
- El stock **nunca queda negativo**: la resta es un `UPDATE ... WHERE cantidad >= x` atómico y además hay un `CHECK (cantidad >= 0)` en la base.
- Un TRA se guarda siempre como `TRA-2394`, aunque se escriba `tra 2394` o `2394`.
- Los códigos de producto se guardan en mayúsculas y sin espacios dobles.
- Reimportar un archivo no duplica productos ni pisa el stock de los que ya existen.

## Stack

- **Frontend:** React 19 + Vite + TypeScript, React Router, Tailwind CSS 4, shadcn/ui, TanStack Query
- **Backend:** Node.js 24 + Express 5 + TypeScript, validación con Zod 4, exceljs
- **Base de datos:** PostgreSQL (Neon) + Prisma 7
- **Deploy:** Vercel (frontend), Render (API), Neon (base de datos)

## Estructura

```
client/            Frontend (React)
  src/features/    una carpeta por módulo: pantalla + llamadas a la API
  src/components/  piezas compartidas (buscador de productos, líneas, selects)
server/            API REST (Express)
  prisma/          schema.prisma, migraciones y seed
  src/modules/     un módulo por funcionalidad: schema (Zod) → service (Prisma) → routes (HTTP)
  src/middlewares/ autenticación, roles y manejo de errores
render.yaml        Blueprint para desplegar la API en Render
```

## Desarrollo local

Requisitos: Node 24 y una base PostgreSQL (por ejemplo, una branch `dev` de Neon).

```bash
git clone https://github.com/BarrantesmzDev/StockFlow.git
cd StockFlow

# Backend
cd server
npm install
cp .env.example .env   # pon tu DATABASE_URL de DESARROLLO (nunca la de producción)
npm run db:migrate     # crea las tablas
npm run db:seed        # ubicaciones y camión iniciales
npm run dev            # http://localhost:3000

# Frontend (en otra terminal)
cd client
npm install
npm run dev            # http://localhost:5173 (reenvía /api a localhost:3000)
```

La primera vez, la app pide **crear el administrador**. Con `LOG_SQL=true` en `server/.env`,
la API imprime cada consulta SQL que genera Prisma.

## API (resumen)

Todas las rutas, salvo `/api/health` y `/api/auth/*`, requieren `Authorization: Bearer <token>`.

| Ruta | Descripción |
|---|---|
| `POST /api/auth/configurar` · `login` · `logout` · `GET /api/auth/yo` | Sesión |
| `GET /api/inventario` · `POST /api/inventario/sistema-cr` | Inventario y conciliación |
| `GET/POST /api/movimientos` | Historial (filtros y paginación) y registro |
| `GET/POST /api/apartados` · `POST /:id/entregar` · `POST /:id/cancelar` | Apartados |
| `GET /api/despachos/documento/:tra` · `POST /api/despachos` · `PUT /:id/lineas/:lineaId` · `POST /:id/despachar` | Empaque |
| `GET/POST/PATCH/DELETE /api/productos` | Catálogo |
| `POST /api/importaciones/leer` · `productos/previsualizar` · `productos/confirmar` | Importación |
| `GET/POST/PATCH /api/usuarios` | Usuarios (solo ADMIN) |

Errores en JSON: `{ "error": "...", "detalles": [{ "campo": "...", "mensaje": "..." }] }`.

## Deploy

1. **API en Render:** New → Blueprint → este repositorio (usa `render.yaml`). Variables:
   `DATABASE_URL` (Neon, branch de producción), `CORS_ORIGIN` (URL del frontend) y
   `ADMIN_EMAIL` (único correo que puede crear el primer administrador).
2. **Frontend en Vercel:** importar el repositorio con *Root Directory* = `client`.
   Variable: `VITE_API_URL` = URL de la API en Render.
3. Entrar a la URL de Vercel y crear el administrador con el correo de `ADMIN_EMAIL`.

Las migraciones se aplican solas en cada deploy (`prisma migrate deploy` en el build de Render).
