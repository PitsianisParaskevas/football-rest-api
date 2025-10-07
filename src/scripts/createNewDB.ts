import "dotenv/config";
import { Client } from "pg";
import fs from "fs";
import path from "path";

/**
 * Parse CLI args.
 * Usage:
 *   npm run createNewDB -- <db> [--recreate] [--dir=src/db/schema] [--seed=src/db/seeds]
 */
function parseArgs() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith("--")) {
    console.error(
      "Usage: npm run createNewDB -- <database_name> [--recreate] [--dir=src/db/schema] [--seed=src/db/seeds]"
    );
    process.exit(1);
  }
  const dbName = args[0];
  const opts = {
    recreate: args.includes("--recreate"),
    dir: getArgValue(
      args,
      "--dir",
      path.resolve(process.cwd(), "src", "db", "schema")
    ),
    seed: getArgValue(args, "--seed", ""), // optional
  };
  return { dbName, ...opts };
}

function getArgValue(args: string[], key: string, fallback: string) {
  const kv = args.find((a) => a.startsWith(key + "="));
  return kv ? kv.split("=", 2)[1] : fallback;
}

/**
 * Create a PG client for a given database.
 * Uses your env var names: PG_HOST, PG_PORT, PG_USER, PG_PASSWORD
 */
function makeClient(database: string) {
  const config: any = {
    host: process.env.PG_HOST || "localhost",
    port: process.env.PG_PORT ? Number(process.env.PG_PORT) : 5432,
    user: process.env.PG_USER || "postgres",
    database,
  };

  const pw = process.env.PG_PASSWORD;
  if (typeof pw === "string" && pw.trim().length > 0) {
    config.password = pw.trim();
  }
  return new Client(config);
}

/**
 * Run a function with a temporary client (connect → run → end).
 */
async function withClient<T>(
  database: string,
  fn: (c: Client) => Promise<T>
): Promise<T> {
  const client = makeClient(database);
  await client.connect();
  try {
    return await fn(client);
  } finally {
    await client.end();
  }
}

/**
 * Ensure database exists; optionally drop+create.
 */
async function ensureDatabase(dbName: string, recreate: boolean) {
  const adminDb = "postgres";
  await withClient(adminDb, async (c) => {
    if (recreate) {
      console.log(`Dropping database "${dbName}" if exists...`);
      // terminate active connections
      await c.query(
        `SELECT pg_terminate_backend(pid)
         FROM pg_stat_activity
         WHERE datname = $1 AND pid <> pg_backend_pid();`,
        [dbName]
      );
      await c.query(`DROP DATABASE IF EXISTS "${dbName}";`);
    }

    const { rowCount } = await c.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [dbName]
    );
    if (rowCount && rowCount > 0) {
      console.log(`Database "${dbName}" already exists.`);
      return;
    }
    console.log(`Creating database "${dbName}"...`);
    await c.query(`CREATE DATABASE "${dbName}"`);
    console.log(`Created database "${dbName}".`);
  });
}

/**
 * Read .sql files from a directory, sorted lexicographically.
 */
function readSqlFiles(
  dir: string
): { file: string; full: string; sql: string }[] {
  if (!fs.existsSync(dir)) {
    throw new Error(`SQL directory not found: ${dir}`);
  }
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".sql"))
    .sort((a, b) => a.localeCompare(b));

  return files.map((file) => {
    const full = path.join(dir, file);
    const sql = fs.readFileSync(full, "utf8");
    return { file, full, sql };
  });
}

/**
 * Execute a single SQL string inside a transaction.
 * If the SQL contains multiple statements, PG will handle them.
 */
async function execSqlInTx(client: Client, sql: string, label: string) {
  const trimmed = sql.trim();
  if (!trimmed) {
    console.log(`${label} skipped (empty).`);
    return;
  }
  try {
    await client.query("BEGIN");
    await client.query(trimmed);
    await client.query("COMMIT");
    console.log(`${label} OK`);
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error(`${label} FAILED`);
    console.error(err?.message || err);
    throw err;
  }
}

/**
 * Apply all .sql files in a directory to a given database.
 */
async function applySqlDir(dbName: string, dir: string, title: string) {
  const items = readSqlFiles(dir);
  if (items.length === 0) {
    console.log(`${title}: no .sql files in ${dir} (skipped).`);
    return;
  }
  console.log(`${title}: applying ${items.length} file(s) from ${dir}`);
  await withClient(dbName, async (c) => {
    for (const { file, sql } of items) {
      const label = `  → ${file}`;
      await execSqlInTx(c, sql, label);
    }
  });
}

/**
 * Optional: show a quick summary of created tables (sanity check).
 */
async function showSummary(dbName: string) {
  await withClient(dbName, async (c) => {
    const res = await c.query(`
      SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_type = 'BASE TABLE'
        AND table_schema NOT IN ('pg_catalog','information_schema')
      ORDER BY table_schema, table_name;
    `);
    console.log(`\nSummary: ${res.rowCount} tables`);
    for (const r of res.rows) {
      console.log(`  - ${r.table_schema}.${r.table_name}`);
    }
  });
}

/**
 * Main
 */
async function main() {
  const { dbName, recreate, dir, seed } = parseArgs();

  console.log(`Target DB: ${dbName}`);
  console.log(`Schema dir: ${dir}`);
  if (seed) console.log(`Seed dir: ${seed}`);

  await ensureDatabase(dbName, recreate);
  await applySqlDir(dbName, dir, "Schema");

  if (seed) {
    // Seeds should be pure INSERT/UPSERT statements; they run after schema
    await applySqlDir(dbName, seed, "Seed");
  }

  await showSummary(dbName);
  console.log("\nDone.");
}

main().catch((e) => {
  console.error("createNewDB failed:", e);
  process.exit(1);
});
