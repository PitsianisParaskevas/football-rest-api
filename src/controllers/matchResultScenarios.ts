import type { RequestHandler } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

export type TeamSide = "home" | "away";

export type MatchResultScenarioRow = {
  id: number;
  match_cust_id: number;
  team_cust_id: number;
  team_side: TeamSide;
  scenario_id: number;
};

export type MatchResultScenarioCreate = {
  match_cust_id: number;
  team_cust_id: number;
  team_side: TeamSide;
  scenario_id: number;
};

// -------- Helpers --------
function normalizeCreate(body: any): MatchResultScenarioCreate[] {
  const arr = Array.isArray(body) ? body : [body];
  if (!arr.length) throw new BadRequestError("Empty payload");

  arr.forEach((x, i) => {
    if (
      !x ||
      typeof x.match_cust_id !== "number" ||
      typeof x.team_cust_id !== "number" ||
      typeof x.scenario_id !== "number" ||
      (x.team_side !== "home" && x.team_side !== "away")
    ) {
      throw new BadRequestError(`Invalid payload at index ${i}`);
    }
  });
  return arr as MatchResultScenarioCreate[];
}

async function assertFKs(items: MatchResultScenarioCreate[]) {
  const matchIds = Array.from(new Set(items.map(i => i.match_cust_id)));
  const teamIds  = Array.from(new Set(items.map(i => i.team_cust_id)));
  const scenIds  = Array.from(new Set(items.map(i => i.scenario_id)));

  const [m, t, s] = await Promise.all([
    pool.query<{ cust_id: number }>(
      `SELECT cust_id FROM matches WHERE cust_id = ANY($1::bigint[])`, [matchIds]),
    pool.query<{ cust_id: number }>(
      `SELECT cust_id FROM teams   WHERE cust_id = ANY($1::bigint[])`, [teamIds]),
    pool.query<{ scenario_id: number }>(
      `SELECT scenario_id FROM scenarios WHERE scenario_id = ANY($1::int[])`, [scenIds]),
  ]);

  const haveM = new Set(m.rows.map(r => Number(r.cust_id)));
  const haveT = new Set(t.rows.map(r => Number(r.cust_id)));
  const haveS = new Set(s.rows.map(r => Number(r.scenario_id)));

  const missing = {
    matches: matchIds.filter(id => !haveM.has(id)),
    teams:   teamIds.filter(id => !haveT.has(id)),
    scenarios: scenIds.filter(id => !haveS.has(id)),
  };
  if (missing.matches.length || missing.teams.length || missing.scenarios.length) {
    throw new BadRequestError(`Foreign key missing: ${JSON.stringify(missing)}`);
  }
}

function keyOf(x: { match_cust_id: number; scenario_id: number; team_side: string }) {
  return `${x.match_cust_id}:${x.scenario_id}:${x.team_side}`;
}

async function findExistingKeys(items: MatchResultScenarioCreate[]): Promise<Set<string>> {
  if (!items.length) return new Set();
  const params: any[] = [];
  const tuples = items.map((it, i) => {
    const base = i * 3;
    params.push(it.match_cust_id, it.scenario_id, it.team_side);
    return `($${base + 1}, $${base + 2}, $${base + 3})`;
  }).join(", ");

  const { rows } = await pool.query<{ match_cust_id: string; scenario_id: string; team_side: string }>(
    `SELECT match_cust_id::text, scenario_id::text, team_side
     FROM match_result_scenarios
     WHERE (match_cust_id, scenario_id, team_side) IN (${tuples})`,
    params
  );
  return new Set(rows.map(r => `${r.match_cust_id}:${r.scenario_id}:${r.team_side}`));
}

// -------- Controllers (typed RequestHandler) --------
export const listAll: RequestHandler = async (_req, res, next) => {
  try {
    const { rows } = await pool.query<MatchResultScenarioRow>(
      `SELECT * FROM match_result_scenarios ORDER BY id DESC`
    );
    res.json(rows);
  } catch (e) { next(e); }
};

export const listByMatch: RequestHandler = async (req, res, next) => {
  try {
    const match_cust_id = Number(req.params.match_cust_id);
    if (Number.isNaN(match_cust_id)) throw new BadRequestError("Invalid match_cust_id");

    const { rows } = await pool.query<MatchResultScenarioRow>(
      `SELECT * FROM match_result_scenarios
       WHERE match_cust_id = $1
       ORDER BY scenario_id, team_side`,
      [match_cust_id]
    );
    res.json(rows);
  } catch (e) { next(e); }
};

export const getById: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new BadRequestError("Invalid id");

    const { rows } = await pool.query<MatchResultScenarioRow>(
      `SELECT * FROM match_result_scenarios WHERE id = $1`,
      [id]
    );
    if (!rows.length) throw new NotFoundError("match_result_scenario not found");
    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const createMany: RequestHandler = async (req, res, next) => {
  try {
    const payload = normalizeCreate(req.body);
    await assertFKs(payload);

    // report which rows already exist (composite unique)
    const existingSet = await findExistingKeys(payload);
    const toInsert = payload.filter(p => !existingSet.has(keyOf(p)));

    let inserted: MatchResultScenarioRow[] = [];
    if (toInsert.length) {
      const params: any[] = [];
      const values = toInsert.map((p, i) => {
        const b = i * 4;
        params.push(p.match_cust_id, p.team_cust_id, p.team_side, p.scenario_id);
        return `($${b+1}, $${b+2}, $${b+3}, $${b+4})`;
      }).join(", ");

      const { rows } = await pool.query<MatchResultScenarioRow>(
        `INSERT INTO match_result_scenarios
         (match_cust_id, team_cust_id, team_side, scenario_id)
         VALUES ${values}
         ON CONFLICT (match_cust_id, scenario_id, team_side) DO NOTHING
         RETURNING *`,
        params
      );
      inserted = rows;
    }

    res.json({
      match_result_scenarios: inserted,
      existing: Array.from(existingSet).map(k => {
        const [match_cust_id, scenario_id, team_side] = k.split(":");
        return { match_cust_id: Number(match_cust_id), scenario_id: Number(scenario_id), team_side };
      })
    });
  } catch (e) { next(e); }
};

/**
 * Update by id — change only scenario_id.
 * Body: { "scenario_id": number }
 * Ensures FK exists and UNIQUE(match_cust_id, scenario_id, team_side) not violated.
 */
export const updateById: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new BadRequestError("Invalid id");

    const { scenario_id } = req.body ?? {};
    if (typeof scenario_id !== "number") {
      throw new BadRequestError("scenario_id is required and must be a number");
    }

    // fetch current row to check collision
    const cur = await pool.query<MatchResultScenarioRow>(
      `SELECT * FROM match_result_scenarios WHERE id = $1`, [id]
    );
    if (!cur.rowCount) throw new NotFoundError("match_result_scenario not found");
    const row = cur.rows[0];

    // FK check (new scenario must exist)
    const s = await pool.query(`SELECT 1 FROM scenarios WHERE scenario_id = $1`, [scenario_id]);
    if (!s.rowCount) throw new BadRequestError(`Foreign key missing: scenario_id ${scenario_id}`);

    // prevent unique collision at (match_cust_id, scenario_id, team_side)
    const dup = await pool.query(
      `SELECT 1 FROM match_result_scenarios
       WHERE match_cust_id = $1 AND scenario_id = $2 AND team_side = $3 AND id <> $4`,
      [row.match_cust_id, scenario_id, row.team_side, id]
    );
    if (dup.rowCount) {
      throw new BadRequestError(
        `Row already exists for (match_cust_id=${row.match_cust_id}, scenario_id=${scenario_id}, team_side='${row.team_side}')`
      );
    }

    const { rows } = await pool.query<MatchResultScenarioRow>(
      `UPDATE match_result_scenarios
       SET scenario_id = $1
       WHERE id = $2
       RETURNING *`,
      [scenario_id, id]
    );
    res.json(rows[0]);
  } catch (e) { next(e); }
};

export const deleteById: RequestHandler = async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (Number.isNaN(id)) throw new BadRequestError("Invalid id");

    const { rowCount } = await pool.query(
      `DELETE FROM match_result_scenarios WHERE id = $1`, [id]
    );
    if (!rowCount) throw new NotFoundError("match_result_scenario not found");
    res.json({ success: true });
  } catch (e) { next(e); }
};
