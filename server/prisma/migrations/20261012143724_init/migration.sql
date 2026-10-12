-- CreateEnum
CREATE TYPE "TipoUbicacion" AS ENUM ('BODEGA', 'SUCURSAL', 'APARTADOS');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'VENTA', 'DEVOLUCION', 'TRASLADO', 'AJUSTE');

-- CreateEnum
CREATE TYPE "EstadoDespacho" AS ENUM ('ABIERTO', 'EMPACADO', 'DESPACHADO', 'CANCELADO');

-- CreateTable
CREATE TABLE "ubicaciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" "TipoUbicacion" NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ubicaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "unidad" TEXT NOT NULL DEFAULT 'UND',
    "peso_kg" DECIMAL(10,3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "camiones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "placa" TEXT,
    "capacidad_kg" DECIMAL(10,2) NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "camiones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "producto_id" INTEGER NOT NULL,
    "ubicacion_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "actualizado_en" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stock_pkey" PRIMARY KEY ("producto_id","ubicacion_id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoMovimiento" NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "origen_id" INTEGER,
    "destino_id" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documento" TEXT,
    "factura" TEXT,
    "nota_credito" TEXT,
    "cliente" TEXT,
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despachos" (
    "id" SERIAL NOT NULL,
    "documento" TEXT NOT NULL,
    "origen_id" INTEGER NOT NULL,
    "destino_id" INTEGER,
    "cliente" TEXT,
    "camion_id" INTEGER,
    "estado" "EstadoDespacho" NOT NULL DEFAULT 'ABIERTO',
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despachos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despacho_lineas" (
    "id" SERIAL NOT NULL,
    "despacho_id" INTEGER NOT NULL,
    "producto_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "cantidad_empacada" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "peso_unitario_kg" DECIMAL(10,3) NOT NULL,

    CONSTRAINT "despacho_lineas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ubicaciones_nombre_key" ON "ubicaciones"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_key" ON "productos"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "camiones_nombre_key" ON "camiones"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "camiones_placa_key" ON "camiones"("placa");

-- CreateIndex
CREATE INDEX "movimientos_producto_id_fecha_idx" ON "movimientos"("producto_id", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_tipo_fecha_idx" ON "movimientos"("tipo", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_documento_idx" ON "movimientos"("documento");

-- CreateIndex
CREATE UNIQUE INDEX "despachos_documento_key" ON "despachos"("documento");

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_ubicacion_id_fkey" FOREIGN KEY ("ubicacion_id") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "ubicaciones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_camion_id_fkey" FOREIGN KEY ("camion_id") REFERENCES "camiones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despacho_lineas" ADD CONSTRAINT "despacho_lineas_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despacho_lineas" ADD CONSTRAINT "despacho_lineas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
