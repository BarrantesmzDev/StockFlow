-- CreateEnum
CREATE TYPE "EstadoApartado" AS ENUM ('ACTIVO', 'ENTREGADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'OPERADOR', 'CONSULTA');

-- AlterTable
ALTER TABLE "despachos" ADD COLUMN     "usuario_id" INTEGER;

-- AlterTable
ALTER TABLE "movimientos" ADD COLUMN     "apartado_id" INTEGER,
ADD COLUMN     "codigo_garantia" TEXT,
ADD COLUMN     "despacho_id" INTEGER,
ADD COLUMN     "serie" TEXT,
ADD COLUMN     "usuario_id" INTEGER;

-- CreateTable
CREATE TABLE "sistema_cr" (
    "codigo" TEXT NOT NULL,
    "nombre" TEXT,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "importado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sistema_cr_pkey" PRIMARY KEY ("codigo")
);

-- CreateTable
CREATE TABLE "apartados" (
    "id" SERIAL NOT NULL,
    "cliente" TEXT NOT NULL,
    "telefono" TEXT,
    "producto_id" INTEGER NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "origen_id" INTEGER NOT NULL,
    "estado" "EstadoApartado" NOT NULL DEFAULT 'ACTIVO',
    "factura" TEXT,
    "notas" TEXT,
    "usuario_id" INTEGER,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cerrado_en" TIMESTAMP(3),

    CONSTRAINT "apartados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acceso_en" TIMESTAMP(3),

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesiones" (
    "id" TEXT NOT NULL,
    "usuario_id" INTEGER NOT NULL,
    "expira_en" TIMESTAMP(3) NOT NULL,
    "creado_en" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "apartados_estado_creado_en_idx" ON "apartados"("estado", "creado_en");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "sesiones_usuario_id_idx" ON "sesiones"("usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "despacho_lineas_despacho_id_producto_id_key" ON "despacho_lineas"("despacho_id", "producto_id");

-- CreateIndex
CREATE INDEX "movimientos_serie_idx" ON "movimientos"("serie");

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_apartado_id_fkey" FOREIGN KEY ("apartado_id") REFERENCES "apartados"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_despacho_id_fkey" FOREIGN KEY ("despacho_id") REFERENCES "despachos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_origen_id_fkey" FOREIGN KEY ("origen_id") REFERENCES "ubicaciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despachos" ADD CONSTRAINT "despachos_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sesiones" ADD CONSTRAINT "sesiones_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Reglas de negocio garantizadas por la base de datos (Prisma no genera CHECK; se agregan a mano)
-- El stock nunca puede quedar negativo, aunque alguien escriba directo en la base.
ALTER TABLE "stock" ADD CONSTRAINT "stock_cantidad_no_negativa" CHECK ("cantidad" >= 0);
-- Un movimiento siempre mueve una cantidad positiva; la dirección la dan origen y destino.
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_cantidad_positiva" CHECK ("cantidad" > 0);
ALTER TABLE "apartados" ADD CONSTRAINT "apartados_cantidad_positiva" CHECK ("cantidad" > 0);
