// src/controllers/matchStats.ts
import type { RequestHandler } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

export type TeamSide = "home" | "away";
export type Phase = "ALL" | "1ST" | "2ND";

export type MatchStatRow = {
  match_cust_id: number;
  team_cust_id: number;
  team_side: TeamSide;
  stat_key: string;
  phase: Phase;
  value: number | null;
  display: string | null;
  total: number | null;
};

export type MatchStatCreate = MatchStatRow;

// ---------- helpers ----------
const isNullableNumber = (v: unknown) =>
  v === null || v === undefined || typeof v === "number";
const isNullableString = (v: unknown) =>
  v === null || v === undefined || typeof v === "string";

function normalizeCreate(body: any): MatchStatCreate[] {
  const arr = Array.isArray(body) ? body : [body];
  if (!arr.length) throw new BadRequestError("Empty payload");

  const allowedSides = new Set<TeamSide>(["home", "away"]);
  const allowedPhases = new Set<Phase>(["ALL", "1ST", "2ND"]);

  arr.forEach((x, i) => {
    const ok =
      x &&
      Number.isInteger(x.match_cust_id) &&
      Number.isInteger(x.team_cust_id) &&
      typeof x.stat_key === "string" &&
      allowedSides.has(x.team_side) &&
      allowedPhases.has(x.phase) &&
      isNullableNumber(x.value) &&
      isNullableString(x.display) &&
      isNullableNumber(x.total);

    if (!ok) throw new BadRequestError(`Invalid match_stat at index ${i}`);
  });

  // normalize undefined → null for nullable fields
  return arr.map((x) => ({
    match_cust_id: x.match_cust_id,
    team_cust_id: x.team_cust_id,
    team_side: x.team_side,
    stat_key: x.stat_key,
    phase: x.phase,
    value: x.value ?? null,
    display: x.display ?? null,
    total: x.total ?? null,
  })) as MatchStatCreate[];
}

async function assertFKs(items: MatchStatCreate[]) {
  const matchIds = Array.from(new Set(items.map((i) => i.match_cust_id)));
  const teamIds = Array.from(new Set(items.map((i) => i.team_cust_id)));

  const [m, t] = await Promise.all([
    pool.query<{ cust_id: number }>(
      `SELECT cust_id FROM matches WHERE cust_id = ANY($1::bigint[])`,
      [matchIds]
    ),
    pool.query<{ cust_id: number }>(
      `SELECT cust_id FROM teams WHERE cust_id = ANY($1::bigint[])`,
      [teamIds]
    ),
  ]);

  const haveM = new Set(m.rows.map((r) => Number(r.cust_id)));
  const haveT = new Set(t.rows.map((r) => Number(r.cust_id)));

  const missing = {
    matches: matchIds.filter((id) => !haveM.has(id)),
    teams: teamIds.filter((id) => !haveT.has(id)),
  };
  if (missing.matches.length || missing.teams.length) {
    throw new BadRequestError(
      `Foreign key missing: ${JSON.stringify(missing)}`
    );
  }
}

function keyOf(x: {
  match_cust_id: number;
  team_cust_id: number;
  stat_key: string;
  phase: string;
}) {
  return `${x.match_cust_id}:${x.team_cust_id}:${x.stat_key}:${x.phase}`;
}

async function findExistingKeys(
  items: MatchStatCreate[]
): Promise<Set<string>> {
  if (!items.length) return new Set();

  const params: any[] = [];
  const tuples = items
    .map((it, i) => {
      const b = i * 4;
      params.push(it.match_cust_id, it.team_cust_id, it.stat_key, it.phase);
      return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4})`;
    })
    .join(", ");

  const { rows } = await pool.query<{
    match_cust_id: string;
    team_cust_id: string;
    stat_key: string;
    phase: string;
  }>(
    `SELECT match_cust_id::text, team_cust_id::text, stat_key, phase
     FROM match_stats
     WHERE (match_cust_id, team_cust_id, stat_key, phase) IN (${tuples})`,
    params
  );

  return new Set(
    rows.map(
      (r) => `${r.match_cust_id}:${r.team_cust_id}:${r.stat_key}:${r.phase}`
    )
  );
}

// ---------- controllers ----------
export const getAllMatchStats: RequestHandler = async (_req, res, next) => {
  try {
    const { rows } = await pool.query<MatchStatRow>(
      `SELECT * FROM match_stats
       ORDER BY match_cust_id DESC, team_side, team_cust_id, stat_key, phase`
    );
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const getByIDMatchStats: RequestHandler = async (req, res, next) => {
  try {
    const match_cust_id = Number(req.params.match_cust_id);
    const team_cust_id = Number(req.params.team_cust_id);
    const stat_key = req.params.stat_key;
    const phase = req.params.phase;

    if (
      Number.isNaN(match_cust_id) ||
      Number.isNaN(team_cust_id) ||
      typeof stat_key !== "string" ||
      typeof phase !== "string"
    ) {
      throw new BadRequestError("Invalid composite key");
    }

    const { rows } = await pool.query<MatchStatRow>(
      `SELECT * FROM match_stats
       WHERE match_cust_id = $1 AND team_cust_id = $2 AND stat_key = $3 AND phase = $4`,
      [match_cust_id, team_cust_id, stat_key, phase]
    );
    if (!rows.length) throw new NotFoundError("match_stat not found");
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

export const createMatchStats: RequestHandler = async (req, res, next) => {
  try {
    const payload = normalizeCreate(req.body);
    await assertFKs(payload);

    // report existing by composite PK
    const existingSet = await findExistingKeys(payload);
    const toInsert = payload.filter((p) => !existingSet.has(keyOf(p)));

    let inserted: MatchStatRow[] = [];
    if (toInsert.length) {
      const params: any[] = [];
      const values = toInsert
        .map((s, i) => {
          const b = i * 8;
          params.push(
            s.match_cust_id,
            s.team_cust_id,
            s.team_side,
            s.stat_key,
            s.phase,
            s.value,
            s.display,
            s.total
          );
          return `($${b + 1}, $${b + 2}, $${b + 3}, $${b + 4}, $${b + 5}, $${
            b + 6
          }, $${b + 7}, $${b + 8})`;
        })
        .join(", ");

      const { rows } = await pool.query<MatchStatRow>(
        `
        INSERT INTO match_stats
          (match_cust_id, team_cust_id, team_side, stat_key, phase, value, display, total)
        VALUES ${values}
        ON CONFLICT (match_cust_id, team_cust_id, stat_key, phase) DO NOTHING
        RETURNING *
        `,
        params
      );
      inserted = rows;
    }

    res.status(201).json({
      match_stats: inserted,
      existing: Array.from(existingSet).map((k) => {
        const [match_cust_id, team_cust_id, stat_key, phase] = k.split(":");
        return {
          match_cust_id: Number(match_cust_id),
          team_cust_id: Number(team_cust_id),
          stat_key,
          phase,
        };
      }),
    });
  } catch (e) {
    next(e);
  }
};

/**
 * editeMatchStats — update numeric/string values only (not the composite PK).
 * Body: { value?: number|null, display?: string|null, total?: number|null }
 */
export const editeMatchStats: RequestHandler = async (req, res, next) => {
  try {
    const match_cust_id = Number(req.params.match_cust_id);
    const team_cust_id = Number(req.params.team_cust_id);
    const stat_key = req.params.stat_key;
    const phase = req.params.phase;

    if (
      Number.isNaN(match_cust_id) ||
      Number.isNaN(team_cust_id) ||
      typeof stat_key !== "string" ||
      typeof phase !== "string"
    ) {
      throw new BadRequestError("Invalid composite key");
    }

    const { value, display, total } = req.body ?? {};
    if (
      !(
        "value" in (req.body ?? {}) ||
        "display" in (req.body ?? {}) ||
        "total" in (req.body ?? {})
      )
    ) {
      throw new BadRequestError(
        "Provide at least one of: value, display, total"
      );
    }
    if (!isNullableNumber(value))
      throw new BadRequestError(`"value" must be number|null`);
    if (!isNullableString(display))
      throw new BadRequestError(`"display" must be string|null`);
    if (!isNullableNumber(total))
      throw new BadRequestError(`"total" must be number|null`);

    const { rows } = await pool.query<MatchStatRow>(
      `
      UPDATE match_stats
      SET value = COALESCE($5, value),
          display = COALESCE($6, display),
          total = COALESCE($7, total)
      WHERE match_cust_id = $1 AND team_cust_id = $2 AND stat_key = $3 AND phase = $4
      RETURNING *
      `,
      [
        match_cust_id,
        team_cust_id,
        stat_key,
        phase,
        value ?? null,
        display ?? null,
        total ?? null,
      ]
    );

    if (!rows.length) throw new NotFoundError("match_stat not found");
    res.json(rows[0]);
  } catch (e) {
    next(e);
  }
};

export const deleteMatchStats: RequestHandler = async (req, res, next) => {
  try {
    const match_cust_id = Number(req.params.match_cust_id);
    const team_cust_id = Number(req.params.team_cust_id);
    const stat_key = req.params.stat_key;
    const phase = req.params.phase;

    if (
      Number.isNaN(match_cust_id) ||
      Number.isNaN(team_cust_id) ||
      typeof stat_key !== "string" ||
      typeof phase !== "string"
    ) {
      throw new BadRequestError("Invalid composite key");
    }

    const { rowCount } = await pool.query(
      `DELETE FROM match_stats
       WHERE match_cust_id = $1 AND team_cust_id = $2 AND stat_key = $3 AND phase = $4`,
      [match_cust_id, team_cust_id, stat_key, phase]
    );
    if (!rowCount) throw new NotFoundError("match_stat not found");
    res.sendStatus(204);
  } catch (e) {
    next(e);
  }
};
