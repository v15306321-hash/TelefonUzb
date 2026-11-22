import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Prisma Client over the Node.js `pg` driver (driver adapter).
 * Uses Node's networking/TLS stack, which works reliably with serverless
 * Postgres providers (Neon, Supabase…) behind SNI-based routing.
 */
export function createPrisma(log: ("warn" | "error")[] = ["error"]) {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");
  const adapter = new PrismaPg({ connectionString, max: Number(process.env.DB_POOL_SIZE ?? 5) });
  return new PrismaClient({ adapter, log });
}
