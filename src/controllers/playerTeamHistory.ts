// src/controllers/playerTeamHistory.ts
import type { RequestHandler } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

// GET all
export const getAllPlayerTeamHistory: RequestHandler = async (
  _req,
  res,
  next
) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM player_team_history ORDER BY id"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET by id
export const getPlayerTeamHistoryById: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "SELECT * FROM player_team_history WHERE id = $1",
      [id]
    );
    if (rows.length === 0) throw new NotFoundError("History record not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// POST (single or bulk)
type PTHRow = {
  player_cust_id: number;
  team_cust_id: number;
  from_date: string;
  to_date?: string | null;
  shirt_number?: number | null;
};

export const createPlayerTeamHistory: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const payload: PTHRow[] = Array.isArray(req.body) ? req.body : [req.body];
    if (!payload.length)
      throw new BadRequestError("Body must be an object or a non-empty array");

    const invalid: Array<{ index: number; reason: string }> = [];
    const rows: PTHRow[] = [];

    payload.forEach((item: any, idx) => {
      const { player_cust_id, team_cust_id, from_date } = item ?? {};
      if (!player_cust_id || !team_cust_id || !from_date) {
        invalid.push({
          index: idx,
          reason:
            "Missing required fields (player_cust_id, team_cust_id, from_date)",
        });
        return;
      }
      rows.push({
        player_cust_id: Number(player_cust_id),
        team_cust_id: Number(team_cust_id),
        from_date: String(from_date),
        to_date: item?.to_date ?? null,
        shirt_number: item?.shirt_number ?? null,
      });
    });

    if (!rows.length) throw new BadRequestError("Missing required fields");

    const cols = [
      "player_cust_id",
      "team_cust_id",
      "from_date",
      "to_date",
      "shirt_number",
    ];
    const values: any[] = [];
    const tuples: string[] = [];

    rows.forEach((r, i) => {
      const base = i * cols.length;
      tuples.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
      );
      values.push(
        r.player_cust_id,
        r.team_cust_id,
        r.from_date,
        r.to_date,
        r.shirt_number
      );
    });

    const sql = `
      INSERT INTO player_team_history (${cols.join(",")})
      VALUES ${tuples.join(",")}
      ON CONFLICT (player_cust_id, team_cust_id, from_date) DO NOTHING
      RETURNING *;
    `;

    const { rows: inserted } = await pool.query(sql, values);
    const skipped_count = payload.length - invalid.length - inserted.length;

    res.status(201).json({
      inserted_count: inserted.length,
      skipped_count: skipped_count < 0 ? 0 : skipped_count,
      invalid,
      inserted,
    });
  } catch (err) {
    next(err);
  }
};

// PUT
export const updatePlayerTeamHistory: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { player_cust_id, team_cust_id, from_date, to_date, shirt_number } =
      req.body;

    const { rows } = await pool.query(
      `
      UPDATE player_team_history
      SET player_cust_id = $1,
          team_cust_id   = $2,
          from_date      = $3,
          to_date        = $4,
          shirt_number   = $5
      WHERE id = $6
      RETURNING *
      `,
      [player_cust_id, team_cust_id, from_date, to_date, shirt_number, id]
    );

    if (rows.length === 0) throw new NotFoundError("History record not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE
export const deletePlayerTeamHistory: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      "DELETE FROM player_team_history WHERE id = $1",
      [id]
    );
    if (rowCount === 0) throw new NotFoundError("History record not found");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
