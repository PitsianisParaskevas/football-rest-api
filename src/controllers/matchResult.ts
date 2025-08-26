import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

export type MatchResultRow = {
  match_cust_id: number;
  home_score_ft: number;
  home_score_ht: number | null;
  home_formation: string | null;
  home_result: string;
  away_score_ft: number;
  away_score_ht: number | null;
  away_formation: string | null;
  away_result: string;
};

export type MatchResultCreate = {
  match_cust_id: number;
  home_score_ft: number;
  home_score_ht?: number | null;
  home_formation?: string | null;
  home_result: "win" | "loss" | "draw" | string;
  away_score_ft: number;
  away_score_ht?: number | null;
  away_formation?: string | null;
  away_result: "win" | "loss" | "draw" | string;
};

function normalizeCreateInput(body: any): MatchResultCreate[] {
  const arr = Array.isArray(body) ? body : [body];
  if (arr.length === 0) throw new BadRequestError("Empty payload");

  for (const [i, x] of arr.entries()) {
    if (
      x == null ||
      typeof x.match_cust_id !== "number" ||
      typeof x.home_score_ft !== "number" ||
      typeof x.away_score_ft !== "number" ||
      typeof x.home_result !== "string" ||
      typeof x.away_result !== "string"
    ) {
      throw new BadRequestError(`Invalid payload at index ${i}`);
    }
  }
  return arr.map(x => ({
    match_cust_id: x.match_cust_id,
    home_score_ft: x.home_score_ft,
    home_score_ht: x.home_score_ht ?? null,
    home_formation: x.home_formation ?? null,
    home_result: x.home_result,
    away_score_ft: x.away_score_ft,
    away_score_ht: x.away_score_ht ?? null,
    away_formation: x.away_formation ?? null,
    away_result: x.away_result,
  }));
}

// ---- optional: FK pre-check so you get a 400 instead of raw PG 23503
async function assertMatchesExist(matchIds: number[]) {
  const unique = Array.from(new Set(matchIds));
  if (!unique.length) return;
  const { rows } = await pool.query<{ cust_id: number }>(
    `SELECT cust_id FROM matches WHERE cust_id = ANY($1::bigint[])`,
    [unique]
  );
  const have = new Set(rows.map(r => Number(r.cust_id)));
  const missing = unique.filter(id => !have.has(id));
  if (missing.length) {
    throw new BadRequestError(`Missing parent matches for: ${missing.join(", ")}`);
  }
}

// -------- Controllers --------
export async function listMatchResults(_req: Request, res: Response) {
  const { rows } = await pool.query<MatchResultRow>(
    `SELECT * FROM match_result ORDER BY match_cust_id DESC`
  );
  res.json(rows);
}

export async function getMatchResultByCustId(req: Request, res: Response) {
  const custId = Number(req.params.match_cust_id);
  if (Number.isNaN(custId)) throw new BadRequestError("Invalid match_cust_id");
  const { rows } = await pool.query<MatchResultRow>(
    `SELECT * FROM match_result WHERE match_cust_id = $1`,
    [custId]
  );
  if (!rows.length) throw new NotFoundError("match_result not found");
  res.json(rows[0]);
}

// bulk-safe create; ON CONFLICT DO NOTHING; returns inserted + existing ids
export async function createMatchResults(req: Request, res: Response) {
  const payload = normalizeCreateInput(req.body);

  // (optional but recommended)
  await assertMatchesExist(payload.map(p => p.match_cust_id));

  // detect existing by match_cust_id
  const ids = payload.map(p => p.match_cust_id);
  const existingQ = await pool.query<{ match_cust_id: number }>(
    `SELECT match_cust_id FROM match_result WHERE match_cust_id = ANY($1::bigint[])`,
    [ids]
  );
  const existingSet = new Set(existingQ.rows.map(r => Number(r.match_cust_id)));
  const toInsert = payload.filter(p => !existingSet.has(p.match_cust_id));

  let inserted: MatchResultRow[] = [];
  if (toInsert.length) {
    const vals: string[] = [];
    const params: any[] = [];
    toInsert.forEach((p, i) => {
      const b = i * 9;
      params.push(
        p.match_cust_id,
        p.home_score_ft,
        p.home_score_ht,
        p.home_formation,
        p.home_result,
        p.away_score_ft,
        p.away_score_ht,
        p.away_formation,
        p.away_result
      );
      vals.push(
        `($${b+1}, $${b+2}, $${b+3}, $${b+4}, $${b+5}, $${b+6}, $${b+7}, $${b+8}, $${b+9})`
      );
    });

    const { rows } = await pool.query<MatchResultRow>(
      `
      INSERT INTO match_result (
        match_cust_id,
        home_score_ft, home_score_ht, home_formation, home_result,
        away_score_ft, away_score_ht, away_formation, away_result
      )
      VALUES ${vals.join(", ")}
      ON CONFLICT (match_cust_id) DO NOTHING
      RETURNING *
      `,
      params
    );
    inserted = rows;
  }

  res.json({
    match_results: inserted,
    existing: Array.from(existingSet),
  });
}

// update by match_cust_id (since there's no id column)
export async function updateMatchResult(req: Request, res: Response) {
  const custId = Number(req.params.match_cust_id);
  if (Number.isNaN(custId)) throw new BadRequestError("Invalid match_cust_id");

  const {
    home_score_ft,
    home_score_ht = null,
    home_formation = null,
    home_result,
    away_score_ft,
    away_score_ht = null,
    away_formation = null,
    away_result,
  } = req.body ?? {};

  if (
    typeof home_score_ft !== "number" ||
    typeof away_score_ft !== "number" ||
    typeof home_result !== "string" ||
    typeof away_result !== "string"
  ) {
    throw new BadRequestError("Missing or invalid required fields");
  }

  const { rows } = await pool.query<MatchResultRow>(
    `
    UPDATE match_result
    SET
      home_score_ft = $1,
      home_score_ht = $2,
      home_formation = $3,
      home_result = $4,
      away_score_ft = $5,
      away_score_ht = $6,
      away_formation = $7,
      away_result = $8
    WHERE match_cust_id = $9
    RETURNING *
    `,
    [
      home_score_ft,
      home_score_ht,
      home_formation,
      home_result,
      away_score_ft,
      away_score_ht,
      away_formation,
      away_result,
      custId,
    ]
  );

  if (!rows.length) throw new NotFoundError("match_result not found");
  res.json(rows[0]);
}

export async function deleteMatchResult(req: Request, res: Response) {
  const custId = Number(req.params.match_cust_id);
  if (Number.isNaN(custId)) throw new BadRequestError("Invalid match_cust_id");

  const { rowCount } = await pool.query(
    `DELETE FROM match_result WHERE match_cust_id = $1`,
    [custId]
  );
  if (rowCount === 0) throw new NotFoundError("match_result not found");
  res.json({ success: true });
}
