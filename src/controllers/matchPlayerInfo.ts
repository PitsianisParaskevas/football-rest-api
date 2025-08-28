import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

// helpers
const num = (v: any) => Number(v);
const numOrNull = (v: any) =>
  v === null || v === undefined || v === "" ? null : Number(v);
const boolOrNull = (v: any) =>
  v === null || v === undefined ? null : Boolean(v);

// GET /match-player-info
export const getAllMatchPlayerInfo = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT * FROM match_player_info ORDER BY id`
  );
  res.json(rows);
};

// GET /match-player-info/:id
export const getMatchPlayerInfoById = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const { rows } = await pool.query(
    `SELECT * FROM match_player_info WHERE id = $1`,
    [id]
  );
  if (!rows.length) throw new NotFoundError("Record not found");
  res.json(rows[0]);
};

// POST /match-player-info  (bulk-friendly, upsert on (match_cust_id, player_cust_id))
export const createMatchPlayerInfo = async (req: Request, res: Response) => {
  const body = Array.isArray(req.body) ? req.body : [req.body];
  if (!body.length) throw new BadRequestError("Empty payload");

  // FK precheck → matches.cust_id
  const matchIds = Array.from(
    new Set(
      body
        .map((r: any) => num(r?.match_cust_id))
        .filter((n) => Number.isFinite(n))
    )
  );

  const missingMatches = new Set<number>();
  if (matchIds.length) {
    const { rows } = await pool.query(
      `SELECT cust_id FROM matches WHERE cust_id = ANY($1::bigint[])`,
      [matchIds]
    );
    const have = new Set(rows.map((r) => Number(r.cust_id)));
    for (const m of matchIds) if (!have.has(m)) missingMatches.add(m);
  }

  const inserted: any[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < body.length; i++) {
    const it: any = body[i] ?? {};
    const match_cust_id = num(it.match_cust_id);
    const player_cust_id = num(it.player_cust_id);
    const starter = boolOrNull(it.starter);
    const substitute = boolOrNull(it.substitute);
    const minutes_played = numOrNull(it.minutes_played);
    const rating = numOrNull(it.rating);

    if (!Number.isFinite(match_cust_id) || !Number.isFinite(player_cust_id)) {
      errors.push({
        index: i,
        message: "Missing required fields (match_cust_id, player_cust_id)",
      });
      continue;
    }
    if (missingMatches.has(match_cust_id)) {
      errors.push({
        index: i,
        message: `Missing parent match: cust_id=${match_cust_id}`,
      });
      continue;
    }

    try {
      const { rows } = await pool.query(
        `
        INSERT INTO match_player_info (
          match_cust_id, player_cust_id, starter, minutes_played, substitute, rating
        ) VALUES ($1,$2,$3,$4,$5,$6)
        ON CONFLICT (match_cust_id, player_cust_id) DO UPDATE SET
          starter = EXCLUDED.starter,
          minutes_played = EXCLUDED.minutes_played,
          substitute = EXCLUDED.substitute,
          rating = EXCLUDED.rating
        RETURNING *
        `,
        [
          match_cust_id,
          player_cust_id,
          starter,
          minutes_played,
          substitute,
          rating,
        ]
      );
      inserted.push(rows[0]);
    } catch (e: any) {
      errors.push({ index: i, message: e?.message ?? "DB error" });
    }
  }

  res.status(inserted.length ? 201 : 400).json({ items: inserted, errors });
};

// PUT /match-player-info/:id  (partial or full update by id)
export const updateMatchPlayerInfo = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const payload = req.body ?? {};
  const keys = Object.keys(payload);
  if (!keys.length) throw new BadRequestError("No fields provided");

  // If match_cust_id is being changed, enforce FK exists
  if (payload.match_cust_id !== undefined) {
    const m = num(payload.match_cust_id);
    if (!Number.isFinite(m)) throw new BadRequestError("Invalid match_cust_id");
    const check = await pool.query(`SELECT 1 FROM matches WHERE cust_id = $1`, [
      m,
    ]);
    if (!check.rowCount)
      throw new BadRequestError(`Missing parent match: cust_id=${m}`);
  }

  const set = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = Object.values(payload);

  const { rows } = await pool.query(
    `UPDATE match_player_info SET ${set} WHERE id = $${
      keys.length + 1
    } RETURNING *`,
    [...values, id]
  );
  if (!rows.length) throw new NotFoundError("Record not found");
  res.json(rows[0]);
};

// DELETE /match-player-info/:id
export const deleteMatchPlayerInfo = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const { rowCount } = await pool.query(
    `DELETE FROM match_player_info WHERE id = $1`,
    [id]
  );
  if (!rowCount) throw new NotFoundError("Record not found");

  res.sendStatus(204);
};
