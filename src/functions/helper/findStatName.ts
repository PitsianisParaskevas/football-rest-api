// src/functions/helper/findStatName.ts
import { pool } from "@/db/client";

export type StatMeta = {
  key: string;
  group: string;
  view_name: string;
};

const cache = new Map<string, StatMeta>();
let metaTableCache: {
  schema: string;
  name: "metadata_statistic" | "metadata_statistics";
} | null = null;

/** Βρες ποιος metadata πίνακας υπάρχει και σε ποιο schema (cache). */
async function resolveMetaTable(): Promise<{
  schema: string;
  name: "metadata_statistic" | "metadata_statistics";
}> {
  if (metaTableCache) return metaTableCache;

  const { rows } = await pool.query<{
    table_schema: string;
    table_name: string;
  }>(
    `
    SELECT table_schema, table_name
    FROM information_schema.tables
    WHERE table_name IN ('metadata_statistic', 'metadata_statistics')
    ORDER BY CASE table_name WHEN 'metadata_statistic' THEN 1 ELSE 2 END
    LIMIT 1
    `
  );

  if (!rows.length) {
    throw new Error(
      `Metadata table not found. Expected one of: public.metadata_statistic | public.metadata_statistics`
    );
  }

  const row = rows[0];
  const name = (
    row.table_name === "metadata_statistic"
      ? "metadata_statistic"
      : "metadata_statistics"
  ) as "metadata_statistic" | "metadata_statistics";

  metaTableCache = { schema: row.table_schema, name };
  return metaTableCache;
}

/** Επιστρέφει { group, view_name } για ένα stat key. */
export async function findStatName(key: string): Promise<StatMeta | null> {
  const k = key.trim();
  const hit = cache.get(k);
  if (hit) return hit;

  const { schema, name } = await resolveMetaTable();
  // Προσοχή: "group" είναι reserved -> χρειάζεται quotes
  const sql = `
    SELECT key, "group", view_name
    FROM ${schema}."${name}"
    WHERE key = $1
    LIMIT 1
  `;
  const { rows } = await pool.query(sql, [k]);

  if (!rows.length) return null;

  const row = rows[0] as { key: string; group: string; view_name: string };
  const meta: StatMeta = {
    key: row.key,
    group: row.group,
    view_name: row.view_name,
  };
  cache.set(k, meta);
  return meta;
}

/** Batch: επιστρέφει map { key -> { group, view_name } } */
export async function findStatNames(
  keys: string[]
): Promise<Record<string, StatMeta>> {
  const unique = Array.from(new Set(keys.map((k) => k.trim())));

  const result: Record<string, StatMeta> = {};
  const toFetch: string[] = [];

  for (const k of unique) {
    const hit = cache.get(k);
    if (hit) result[k] = hit;
    else toFetch.push(k);
  }
  if (!toFetch.length) return result;

  const { schema, name } = await resolveMetaTable();
  const placeholders = toFetch.map((_, i) => `$${i + 1}`).join(", ");
  const sql = `
    SELECT key, "group", view_name
    FROM ${schema}."${name}"
    WHERE key IN (${placeholders})
  `;
  const { rows } = await pool.query(sql, toFetch);

  for (const r of rows as Array<{
    key: string;
    group: string;
    view_name: string;
  }>) {
    const meta: StatMeta = {
      key: r.key,
      group: r.group,
      view_name: r.view_name,
    };
    cache.set(r.key, meta);
    result[r.key] = meta;
  }

  return result;
}
