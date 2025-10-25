import { pool } from "@/db/client";

/** Τελικό shape ανά stat_key (χωρίς samples, με metadata) */
export interface PlayerStatGrouped {
  total: number | null; // SUM(stat_value)
  avg: number | null; // AVG(stat_value)
  appearances: number; // COUNT(DISTINCT match_cust_id)
  name: string | null; // metadata.view_name
  group: string | null; // metadata.group
}

export type PlayerStatsGroupedMap = Record<string, PlayerStatGrouped>;

/**
 * Ομαδοποιεί ανά stat_key: total (SUM), avg (AVG), appearances (COUNT DISTINCT)
 * + εμπλουτισμός από metadata (name=view_name, group=group).
 */
export async function getPlayerStatsGrouped(
  playerCustId: number,
  opts?: { includeKeys?: string[]; excludeKeys?: string[] }
): Promise<PlayerStatsGroupedMap> {
  if (!Number.isFinite(playerCustId)) {
    throw new Error("Invalid playerCustId");
  }

  const include = opts?.includeKeys?.length
    ? opts.includeKeys.map((k) => k.toLowerCase())
    : null;
  const exclude = opts?.excludeKeys?.length
    ? opts.excludeKeys.map((k) => k.toLowerCase())
    : null;

  const clauses: string[] = ["player_cust_id = $1"];
  const params: any[] = [playerCustId];
  let p = 1;

  if (include) {
    clauses.push(`LOWER(stat_key) = ANY($${++p})`);
    params.push(include);
  }
  if (exclude) {
    clauses.push(`NOT (LOWER(stat_key) = ANY($${++p}))`);
    params.push(exclude);
  }

  const sql = `
    WITH base AS (
      SELECT
        match_cust_id,
        LOWER(stat_key) AS stat_key,
        NULLIF(stat_value::text, '')::float8 AS val
      FROM match_player_stats
      WHERE ${clauses.join(" AND ")}
    ),
    grouped AS (
      SELECT
        stat_key,
        COUNT(DISTINCT match_cust_id) AS appearances,
        SUM(val)                      AS total,
        AVG(val)                      AS avg
      FROM base
      GROUP BY stat_key
    ),
    meta AS (
      SELECT
        LOWER("key") AS stat_key,     -- <-- εδώ ήταν το πρόβλημα
        view_name,
        "group" AS group_name         -- "group" είναι reserved, θέλει quotes
      FROM metadata_statistics        -- αν ο πίνακας λέγεται metadata_statistic, βάλε το εδώ
    )
    SELECT
      g.stat_key,
      g.appearances,
       ROUND(g.total::numeric, 1) AS total,   -- ✅ round to 1 decimal
      ROUND(g.avg::numeric, 1)   AS avg,     -- ✅ round to 1 decimal
      m.view_name,
      m.group_name
    FROM grouped g
    LEFT JOIN meta m USING (stat_key)
    ORDER BY g.stat_key;
  `;

  const { rows } = await pool.query(sql, params);

  const out: PlayerStatsGroupedMap = {};
  for (const r of rows) {
    const key = String(r.stat_key);
    out[key] = {
      total: r.total === null ? null : Number(r.total),
      avg: r.avg === null ? null : Number(r.avg),
      appearances: Number(r.appearances),
      name: r.view_name ?? null,
      group: r.group_name ?? null,
    };
  }

  return out;
}
