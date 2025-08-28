// src/controllers/MatchPlayerStats.ts
import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

type MPS = {
  match_cust_id: number;
  player_cust_id: number;
  stat_key: string;
  stat_value?: number | null;
};

// GET /match-player-stats
export const getAllMatchPlayerStats = async (req: Request, res: Response) => {
  const {
    match_cust_id,
    player_cust_id,
    stat_key,
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
  if (stat_key !== undefined) {
    params.push(String(stat_key));
    clauses.push(`stat_key = $${params.length}`);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(Number(limit), Number(offset));

  const { rows } = await pool.query(
    `
    SELECT id, match_cust_id, player_cust_id, stat_key, stat_value
    FROM match_player_stats
    ${where}
    ORDER BY id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  res.json(rows);
};

// GET /match-player-stats/:id
export const getMatchPlayerStatsById = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const { rows } = await pool.query(
    `
    SELECT id, match_cust_id, player_cust_id, stat_key, stat_value
    FROM match_player_stats
    WHERE id = $1
    `,
    [id]
  );

  if (rows.length === 0)
    throw new NotFoundError("Match player stat not found.");
  res.json(rows[0]);
};

// POST /match-player-stats  (single or bulk) — upsert on (match_cust_id, player_cust_id, stat_key)
export const createMatchPlayerStats = async (req: Request, res: Response) => {
  const payload = Array.isArray(req.body)
    ? (req.body as MPS[])
    : [req.body as MPS];
  if (payload.length === 0) throw new BadRequestError("Request body is empty.");

  payload.forEach((r, i) => {
    if (
      typeof r.match_cust_id !== "number" ||
      typeof r.player_cust_id !== "number" ||
      typeof r.stat_key !== "string"
    ) {
      throw new BadRequestError(
        `Row ${i} missing required fields (match_cust_id:number, player_cust_id:number, stat_key:string).`
      );
    }
  });

  const cols = [
    "match_cust_id",
    "player_cust_id",
    "stat_key",
    "stat_value",
  ] as const;

  const values: any[] = [];
  const tuples: string[] = [];

  payload.forEach((r, i) => {
    const base = i * cols.length;
    tuples.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
    values.push(
      r.match_cust_id,
      r.player_cust_id,
      r.stat_key,
      r.stat_value ?? null
    );
  });

  const sql = `
    INSERT INTO match_player_stats (${cols.join(", ")})
    VALUES ${tuples.join(",")}
    ON CONFLICT (match_cust_id, player_cust_id, stat_key)
    DO UPDATE SET stat_value = EXCLUDED.stat_value
    RETURNING id, match_cust_id, player_cust_id, stat_key, stat_value
  `;

  const { rows } = await pool.query(sql, values);
  res.status(201).json({ upserted: rows.length, rows });
};

// PUT /match-player-stats/:id (partial update)
export const updateMatchPlayerStats = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const allowed: (keyof MPS)[] = [
    "match_cust_id",
    "player_cust_id",
    "stat_key",
    "stat_value",
  ];
  const sets: string[] = [];
  const params: any[] = [];

  allowed.forEach((k) => {
    if (k in req.body) {
      params.push(req.body[k]);
      sets.push(`${k} = $${params.length}`);
    }
  });

  if (sets.length === 0)
    throw new BadRequestError("No updatable fields provided.");

  params.push(id);

  const { rows } = await pool.query(
    `
    UPDATE match_player_stats
    SET ${sets.join(", ")}
    WHERE id = $${params.length}
    RETURNING id, match_cust_id, player_cust_id, stat_key, stat_value
    `,
    params
  );

  if (rows.length === 0)
    throw new NotFoundError("Match player stat not found.");
  res.json(rows[0]);
};

// DELETE /match-player-stats/:id
export const deleteMatchPlayerStats = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const { rowCount } = await pool.query(
    `DELETE FROM match_player_stats WHERE id = $1`,
    [id]
  );

  if (rowCount === 0) throw new NotFoundError("Match player stat not found.");
  res.json({ deleted: rowCount });
};
