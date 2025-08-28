// src/controllers/MatchPlayerShot.ts
import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

type MatchPlayerShot = {
  shot_id?: number; // unique external id (identity in DB)
  match_cust_id: number;
  player_cust_id: number;
  time?: number | null;
  shot_type?: string | null; // 'miss' | 'goal' | 'block' | 'save' | etc.
  situation?: string | null; // 'regular' | 'assisted' | 'corner' | etc.
  body_part?: string | null; // 'left-foot' | 'right-foot' | 'head' | etc.
  xg?: number | null;
  xgot?: number | null;
  details_json?: unknown | null; // JSONB
};

// GET /match-player-shots
export const getAllMatchPlayerShots = async (req: Request, res: Response) => {
  const {
    match_cust_id,
    player_cust_id,
    shot_type,
    situation,
    body_part,
    min_time,
    max_time,
    limit = "500",
    offset = "0",
  } = req.query;

  const clauses: string[] = [];
  const params: any[] = [];

  if (match_cust_id !== undefined) {
    params.push(Number(match_cust_id));
    clauses.push(`match_cust_id = $${params.length}`);
  }
  if (player_cust_id !== undefined) {
    params.push(Number(player_cust_id));
    clauses.push(`player_cust_id = $${params.length}`);
  }
  if (shot_type !== undefined) {
    params.push(String(shot_type));
    clauses.push(`shot_type = $${params.length}`);
  }
  if (situation !== undefined) {
    params.push(String(situation));
    clauses.push(`situation = $${params.length}`);
  }
  if (body_part !== undefined) {
    params.push(String(body_part));
    clauses.push(`body_part = $${params.length}`);
  }
  if (min_time !== undefined) {
    params.push(Number(min_time));
    clauses.push(`time >= $${params.length}`);
  }
  if (max_time !== undefined) {
    params.push(Number(max_time));
    clauses.push(`time <= $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(Number(limit), Number(offset));

  const { rows } = await pool.query(
    `
    SELECT
      id, shot_id, match_cust_id, player_cust_id, time,
      shot_type, situation, body_part, xg, xgot, details_json
    FROM match_player_shot
    ${where}
    ORDER BY id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  res.json(rows);
};

// GET /match-player-shots/:id   (by surrogate PK id)
export const getMatchPlayerShotById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const { rows } = await pool.query(
    `
    SELECT
      id, shot_id, match_cust_id, player_cust_id, time,
      shot_type, situation, body_part, xg, xgot, details_json
    FROM match_player_shot
    WHERE id = $1
    `,
    [id]
  );

  if (rows.length === 0)
    throw new NotFoundError("Match player shot not found.");
  res.json(rows[0]);
};

// POST /match-player-shots   (bulk or single)
// - If payload includes shot_id(s): uses OVERRIDING SYSTEM VALUE and UPSERT on (shot_id)
// - If payload omits shot_id: inserts normally (DB generates shot_id), still safe to keep ON CONFLICT
export const createMatchPlayerShots = async (req: Request, res: Response) => {
  const payload = Array.isArray(req.body)
    ? (req.body as MatchPlayerShot[])
    : [req.body as MatchPlayerShot];
  if (payload.length === 0) throw new BadRequestError("Request body is empty.");

  // validate basics
  payload.forEach((r, i) => {
    if (
      typeof r.match_cust_id !== "number" ||
      typeof r.player_cust_id !== "number"
    ) {
      throw new BadRequestError(
        `Row ${i} missing required fields (match_cust_id:number, player_cust_id:number).`
      );
    }
    if (r.shot_id !== undefined && typeof r.shot_id !== "number") {
      throw new BadRequestError(
        `Row ${i} has invalid shot_id (must be number if provided).`
      );
    }
  });

  const allHaveShotId = payload.every((r) => typeof r.shot_id === "number");

  // Build dynamic column list (if all rows provide shot_id, include it with OVERRIDING SYSTEM VALUE)
  const baseCols = [
    "match_cust_id",
    "player_cust_id",
    "time",
    "shot_type",
    "situation",
    "body_part",
    "xg",
    "xgot",
    "details_json",
  ] as const;

  const cols = allHaveShotId ? (["shot_id", ...baseCols] as const) : baseCols;

  const values: any[] = [];
  const tuples: string[] = [];

  payload.forEach((r, i) => {
    const rowVals = allHaveShotId
      ? [
          r.shot_id!, // asserted by allHaveShotId
          r.match_cust_id,
          r.player_cust_id,
          r.time ?? null,
          r.shot_type ?? null,
          r.situation ?? null,
          r.body_part ?? null,
          r.xg ?? null,
          r.xgot ?? null,
          r.details_json ?? null,
        ]
      : [
          r.match_cust_id,
          r.player_cust_id,
          r.time ?? null,
          r.shot_type ?? null,
          r.situation ?? null,
          r.body_part ?? null,
          r.xg ?? null,
          r.xgot ?? null,
          r.details_json ?? null,
        ];

    const placeholders = rowVals.map((_, j) => {
      // Cast JSON param explicitly
      const isDetails =
        cols[j] === "details_json" ||
        (!allHaveShotId && baseCols[j] === "details_json");
      const idx = values.length + 1 + j;
      return isDetails ? `$${idx}::jsonb` : `$${idx}`;
    });

    values.push(...rowVals);
    tuples.push(`(${placeholders.join(", ")})`);
  });

  const overriding = allHaveShotId ? "OVERRIDING SYSTEM VALUE" : "";

  const sql = `
    INSERT INTO match_player_shot (${cols.join(", ")})
    ${overriding}
    VALUES ${tuples.join(", ")}
    ON CONFLICT (shot_id)
    DO UPDATE SET
      match_cust_id = EXCLUDED.match_cust_id,
      player_cust_id = EXCLUDED.player_cust_id,
      time = EXCLUDED.time,
      shot_type = EXCLUDED.shot_type,
      situation = EXCLUDED.situation,
      body_part = EXCLUDED.body_part,
      xg = EXCLUDED.xg,
      xgot = EXCLUDED.xgot,
      details_json = EXCLUDED.details_json
    RETURNING
      id, shot_id, match_cust_id, player_cust_id, time,
      shot_type, situation, body_part, xg, xgot, details_json
  `;

  const { rows } = await pool.query(sql, values);
  res.status(201).json({ upserted: rows.length, rows });
};

// PUT /match-player-shots/:id  (partial update by surrogate PK id)
export const updateMatchPlayerShot = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  // fields that can be updated (we do NOT allow changing shot_id here; keep it stable)
  const allowed: (keyof MatchPlayerShot)[] = [
    "match_cust_id",
    "player_cust_id",
    "time",
    "shot_type",
    "situation",
    "body_part",
    "xg",
    "xgot",
    "details_json",
  ];

  const sets: string[] = [];
  const params: any[] = [];

  allowed.forEach((k) => {
    if (k in req.body) {
      const idx = params.length + 1;
      const cast = k === "details_json" ? `::jsonb` : "";
      sets.push(`${k} = $${idx}${cast}`);
      params.push(req.body[k]);
    }
  });

  if (sets.length === 0)
    throw new BadRequestError("No updatable fields provided.");

  params.push(id);

  const { rows } = await pool.query(
    `
    UPDATE match_player_shot
    SET ${sets.join(", ")}
    WHERE id = $${params.length}
    RETURNING
      id, shot_id, match_cust_id, player_cust_id, time,
      shot_type, situation, body_part, xg, xgot, details_json
    `,
    params
  );

  if (rows.length === 0)
    throw new NotFoundError("Match player shot not found.");
  res.json(rows[0]);
};

// DELETE /match-player-shots/:id
export const deleteMatchPlayerShot = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const { rowCount } = await pool.query(
    `DELETE FROM match_player_shot WHERE id = $1`,
    [id]
  );
  if (rowCount === 0) throw new NotFoundError("Match player shot not found.");

  res.json({ deleted: rowCount });
};
