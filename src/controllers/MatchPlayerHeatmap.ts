// src/controllers/MatchPlayerHeatmap.ts
import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

type MPHeatmapRow = {
  match_cust_id: number;
  player_cust_id: number;
  heatmap?: unknown;
  details_json?: unknown;
};

function normalizeHeatmap(input: unknown): any {
  if (input == null) return null;

  if (typeof input === "string") {
    try {
      const parsed = JSON.parse(input);
      if (Array.isArray(parsed)) {
        return parsed.map((el) => {
          if (typeof el === "string") {
            try {
              return JSON.parse(el);
            } catch {
              return el;
            }
          }
          return el;
        });
      }
      return parsed;
    } catch {
      return input;
    }
  }

  if (Array.isArray(input)) {
    return input.map((el) => {
      if (typeof el === "string") {
        try {
          return JSON.parse(el);
        } catch {
          return el;
        }
      }
      return el;
    });
  }

  return input;
}

// GET all
export const getAllMatchPlayerHeatmaps = async (
  req: Request,
  res: Response
) => {
  const {
    match_cust_id,
    player_cust_id,
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

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  params.push(Number(limit), Number(offset));

  const { rows } = await pool.query(
    `
    SELECT id, match_cust_id, player_cust_id, heatmap
    FROM match_player_heatmap
    ${where}
    ORDER BY id ASC
    LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
    params
  );

  res.json(rows);
};

// GET by id
export const getMatchPlayerHeatmapById = async (
  req: Request,
  res: Response
) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const { rows } = await pool.query(
    `SELECT id, match_cust_id, player_cust_id, heatmap
     FROM match_player_heatmap WHERE id = $1`,
    [id]
  );

  if (rows.length === 0)
    throw new NotFoundError("Match player heatmap not found.");
  res.json(rows[0]);
};

// POST (bulk or single) — upsert
export const createMatchPlayerHeatmaps = async (
  req: Request,
  res: Response
) => {
  const payload = Array.isArray(req.body)
    ? (req.body as MPHeatmapRow[])
    : [req.body as MPHeatmapRow];
  if (payload.length === 0) throw new BadRequestError("Request body is empty.");

  payload.forEach((r, i) => {
    if (
      typeof r.match_cust_id !== "number" ||
      typeof r.player_cust_id !== "number"
    ) {
      throw new BadRequestError(
        `Row ${i} missing required fields (match_cust_id:number, player_cust_id:number).`
      );
    }
    if (r.heatmap === undefined && r.details_json === undefined) {
      throw new BadRequestError(
        `Row ${i} missing heatmap (send "heatmap" or "details_json").`
      );
    }
  });

  const values: any[] = [];
  const tuples: string[] = [];

  payload.forEach((r) => {
    const normalized = normalizeHeatmap(r.heatmap ?? r.details_json ?? null);
    const jsonText = JSON.stringify(normalized); // <-- IMPORTANT
    const base = [r.match_cust_id, r.player_cust_id, jsonText];
    const placeholders = base.map((_, j) => {
      const idx = values.length + j + 1;
      return j === 2 ? `$${idx}::jsonb` : `$${idx}`;
    });
    values.push(...base);
    tuples.push(`(${placeholders.join(", ")})`);
  });

  const sql = `
    INSERT INTO match_player_heatmap (match_cust_id, player_cust_id, heatmap)
    VALUES ${tuples.join(", ")}
    ON CONFLICT (match_cust_id, player_cust_id)
    DO UPDATE SET heatmap = EXCLUDED.heatmap
    RETURNING id, match_cust_id, player_cust_id, heatmap
  `;

  const { rows } = await pool.query(sql, values);
  res.status(201).json({ upserted: rows.length, rows });
};

// PUT by id
export const updateMatchPlayerHeatmap = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const allowed = [
    "match_cust_id",
    "player_cust_id",
    "heatmap",
    "details_json",
  ] as const;

  const sets: string[] = [];
  const params: any[] = [];

  for (const k of allowed) {
    if (k in req.body) {
      const idx = params.length + 1;
      if (k === "heatmap" || k === "details_json") {
        const normalized = normalizeHeatmap(req.body[k]);
        params.push(JSON.stringify(normalized)); // <-- IMPORTANT
        sets.push(`heatmap = $${idx}::jsonb`);
      } else {
        params.push(req.body[k]);
        sets.push(`${k} = $${idx}`);
      }
    }
  }

  if (sets.length === 0)
    throw new BadRequestError("No updatable fields provided.");
  params.push(id);

  const { rows } = await pool.query(
    `
    UPDATE match_player_heatmap
    SET ${sets.join(", ")}
    WHERE id = $${params.length}
    RETURNING id, match_cust_id, player_cust_id, heatmap
    `,
    params
  );

  if (rows.length === 0)
    throw new NotFoundError("Match player heatmap not found.");
  res.json(rows[0]);
};

// DELETE by id
export const deleteMatchPlayerHeatmap = async (req: Request, res: Response) => {
  const id = Number(req.params.id);
  if (Number.isNaN(id)) throw new BadRequestError("Invalid id.");

  const { rowCount } = await pool.query(
    `DELETE FROM match_player_heatmap WHERE id = $1`,
    [id]
  );
  if (rowCount === 0)
    throw new NotFoundError("Match player heatmap not found.");

  res.json({ deleted: rowCount });
};
