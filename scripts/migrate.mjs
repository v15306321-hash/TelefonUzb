/**
 * Applies SQL migrations from prisma/migrations using the Node.js `pg` driver.
 * Compatible with Prisma's `_prisma_migrations` bookkeeping table, so it can be
 * mixed with `prisma migrate deploy`. Each migration runs in a transaction.
 */
import { createHash, randomUUID } from "node:crypto";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const dir = path.join(process.cwd(), "prisma", "migrations");
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function connectWithRetry(attempts = 6) {
  for (let i = 1; i <= attempts; i++) {
    try {
      await client.connect();
      return;
    } catch (e) {
      console.log(`[migrate] connection attempt ${i}/${attempts} failed: ${e.code || e.message}`);
      if (i === attempts) throw e;
      await new Promise((r) => setTimeout(r, 5000));
    }
  }
}

await connectWithRetry();
await client.query(`CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
  "id" VARCHAR(36) PRIMARY KEY NOT NULL,
  "checksum" VARCHAR(64) NOT NULL,
  "finished_at" TIMESTAMPTZ,
  "migration_name" VARCHAR(255) NOT NULL,
  "logs" TEXT,
  "rolled_back_at" TIMESTAMPTZ,
  "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "applied_steps_count" INTEGER NOT NULL DEFAULT 0
)`);
const done = new Set(
  (await client.query(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`)).rows.map((r) => r.migration_name),
);
const migrations = readdirSync(dir, { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(path.join(dir, d.name, "migration.sql")))
  .map((d) => d.name)
  .sort();

let applied = 0;
for (const name of migrations) {
  if (done.has(name)) continue;
  const sql = readFileSync(path.join(dir, name, "migration.sql"), "utf8");
  const checksum = createHash("sha256").update(sql).digest("hex");
  console.log(`[migrate] applying ${name}`);
  await client.query("BEGIN");
  try {
    await client.query(sql);
    await client.query(
      `INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, applied_steps_count) VALUES ($1, $2, now(), $3, 1)`,
      [randomUUID(), checksum, name],
    );
    await client.query("COMMIT");
    applied++;
  } catch (e) {
    await client.query("ROLLBACK");
    console.error(`[migrate] ${name} failed:`, e.message);
    await client.end();
    process.exit(1);
  }
}
console.log(`[migrate] ${applied ? `${applied} migration(s) applied` : "database is up to date"}`);
await client.end();
