// controllers/matchStats.ts
import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

const num = (v: any): number => Number(v);
const numOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};
const isTeamSide = (s: any): s is "home" | "away" =>
  String(s).toLowerCase() === "home" || String(s).toLowerCase() === "away";
const isPhase = (v: any): v is "ALL" | "1ST" | "2ND" =>
  v === "ALL" || v === "1ST" || v === "2ND";

// tiny helper to read raw body when Content-Type isn't parsed by express.json()
function readRawBody(req: Request): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

// ---------- GET all ----------
export const getAllMatchStats = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT id, match_cust_id, team_cust_id, team_side, stat_key, phase,
            value, display, total
     FROM match_stats
     ORDER BY id`
  );
  res.json(rows);
};

// ---------- GET by ID ----------
export const getMatchStatsById = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const { rows } = await pool.query(
    `SELECT id, match_cust_id, team_cust_id, team_side, stat_key, phase,
            value, display, total
     FROM match_stats
     WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) throw new NotFoundError("Match stat not found");
  res.json(rows[0]);
};

// ---------- CREATE (array or single). Handles text/plain without changing server/client ----------
export const createMatchStats = async (req: Request, res: Response) => {
  // Normalize body: if express.json() didn’t parse it (e.g. text/plain), read raw and JSON.parse
  let body: unknown = req.body;

  if (
    body === undefined ||
    body === null ||
    (typeof body === "string" && body.trim() === "")
  ) {
    const raw = await readRawBody(req);
    if (!raw) throw new BadRequestError("Empty payload");
    try {
      body = JSON.parse(raw);
    } catch {
      throw new BadRequestError("Body is not valid JSON");
    }
  }

  const items = Array.isArray(body) ? body : [body];
  if (items.length === 0) throw new BadRequestError("Empty payload");

  const inserted: any[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < items.length; i++) {
    const it: any = items[i] ?? {};
    const match_cust_id = num(it.match_cust_id);
    const team_cust_id = num(it.team_cust_id);
    const team_side = String(it.team_side ?? "").toLowerCase();
    const stat_key = String(it.stat_key ?? "");
    const phase = String(it.phase ?? "");
    const value = numOrNull(it.value);
    const display = it.display ?? null;
    const total = numOrNull(it.total);

    const valid =
      Number.isFinite(match_cust_id) &&
      Number.isFinite(team_cust_id) &&
      isTeamSide(team_side) &&
      !!stat_key &&
      isPhase(phase);

    if (!valid) {
      errors.push({
        index: i,
        message:
          "Invalid fields. Required: match_cust_id(number), team_cust_id(number), team_side(home|away), stat_key(string), phase(ALL|1ST|2ND)",
      });
      continue;
    }

    try {
      const { rows } = await pool.query(
        `
        INSERT INTO match_stats (
          match_cust_id, team_cust_id, team_side, stat_key, phase, value, display, total
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
        ON CONFLICT (match_cust_id, team_cust_id, stat_key, phase)
        DO UPDATE SET
          team_side = EXCLUDED.team_side,
          value     = EXCLUDED.value,
          display   = EXCLUDED.display,
          total     = EXCLUDED.total
        RETURNING id, match_cust_id, team_cust_id, team_side, stat_key, phase, value, display, total
        `,
        [
          match_cust_id,
          team_cust_id,
          team_side,
          stat_key,
          phase,
          value,
          display,
          total,
        ]
      );
      inserted.push(rows[0]);
    } catch (e: any) {
      errors.push({ index: i, message: e?.message ?? "DB error" });
    }
  }

  res.status(inserted.length ? 201 : 400).json({ items: inserted, errors });
};

// ---------- UPDATE by ID ----------
export const updateMatchStats = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const team_side = String(req.body?.team_side ?? "").toLowerCase();
  const value = numOrNull(req.body?.value);
  const display = req.body?.display ?? null;
  const total = numOrNull(req.body?.total);

  if (!isTeamSide(team_side)) {
    throw new BadRequestError("team_side must be 'home' or 'away'");
  }

  const { rows } = await pool.query(
    `
    UPDATE match_stats
    SET team_side = $2, value = $3, display = $4, total = $5
    WHERE id = $1
    RETURNING id, match_cust_id, team_cust_id, team_side, stat_key, phase,
              value, display, total
    `,
    [id, team_side, value, display, total]
  );

  if (rows.length === 0) throw new NotFoundError("Match stat not found");
  res.json(rows[0]);
};

// ---------- DELETE by ID ----------
export const deleteMatchStats = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const { rowCount } = await pool.query(
    `DELETE FROM match_stats WHERE id = $1`,
    [id]
  );
  if (rowCount === 0) throw new NotFoundError("Match stat not found");
  res.sendStatus(204);
};
