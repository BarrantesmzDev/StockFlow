# StockFlow

Sistema de inventario web: importación de Excel/CSV, entradas, ventas, traslados
entre sucursales, apartados, empaque por número de traslado y control de peso
en cargas de camión.

## Stack

- **Frontend:** React + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** PostgreSQL (Neon) + Prisma 7

## Instalación

```bash
git clone https://github.com/TU_USUARIO/stockflow.git
cd stockflow

# Backend
cd server
npm install
cp .env.example .env   # luego pon tu DATABASE_URL en .env
npm run dev            # http://localhost:3000

# Frontend (en otra terminal)
cd client
npm install
npm run dev            # http://localhost:5173
```

## Estado

En desarrollo
