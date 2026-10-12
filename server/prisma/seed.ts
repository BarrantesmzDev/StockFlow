import "dotenv/config";
import { prisma } from "../src/lib/prisma.ts";

async function main() {
  const ubicaciones = [
    { nombre: "Guadalupe", tipo: "BODEGA" },
    { nombre: "Santa Ana", tipo: "SUCURSAL" },
    { nombre: "Monte Negro", tipo: "SUCURSAL" },
    { nombre: "Apartados", tipo: "APARTADOS" },
  ] as const;

  for (const u of ubicaciones) {
    await prisma.ubicacion.upsert({
      where: { nombre: u.nombre },
      update: {},
      create: u,
    });
  }

  await prisma.camion.upsert({
    where: { nombre: "Camión 2 toneladas" },
    update: {},
    create: { nombre: "Camión 2 toneladas", capacidadKg: 2000 },
  });

  console.log("Ubicaciones y camión cargados");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
