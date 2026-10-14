import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DATABASE_URL en server/.env");
}

const adapter = new PrismaPg({ connectionString });

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: "event", level: "query" },
    { emit: "stdout", level: "warn" },
  ],
});

if (process.env.LOG_SQL === "true") {
  prisma.$on("query", (e) => {
    const sql = e.query.replaceAll('"public".', "");
    console.log(`\n[SQL ${e.duration.toFixed(0)} ms] ${sql}\n  params: ${e.params}`);
  });
}