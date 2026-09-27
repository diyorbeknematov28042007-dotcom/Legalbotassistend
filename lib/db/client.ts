import { attachDatabasePool } from "@vercel/functions";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "@/lib/db/schema";
import { requireEnv } from "@/lib/env";

type DbGlobal = typeof globalThis & {
  __legalNewsPool?: Pool;
};

const globalDb = globalThis as DbGlobal;

function createPool(): Pool {
  const pool = new Pool({
    connectionString: requireEnv("DATABASE_URL"),
    max: 3,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

  attachDatabasePool(pool);
  return pool;
}

export function getPool(): Pool {
  if (!globalDb.__legalNewsPool) {
    globalDb.__legalNewsPool = createPool();
  }
  return globalDb.__legalNewsPool;
}

export function getDb() {
  return drizzle(getPool(), { schema });
}
