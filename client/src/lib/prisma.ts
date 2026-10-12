import "dotenv/config";
import { PrismaClient } from "@prisma/adapter-pg";
import { PrismaClientOptions } from "../generated/client.ts";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("Falta DataBase_URL en server/.env");
}

const adapter = new prismaPG({ connectionString });

export const prisma = new PrismaClient({ adapter });
