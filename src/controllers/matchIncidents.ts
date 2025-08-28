// src/controllers/matchIncidents.ts
import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

// Helpers
const num = (v: any) => Number(v);
const numOrNull = (v: any) =>
  v === null || v === undefined || v === "" ? null : Number(v);
const isTeamSide = (s: any): s is "home" | "away" =>
  ["home", "away"].includes(String(s).toLowerCase());

// ---------- GET all ----------
export const getAllMatchIncidents = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(
    `SELECT * FROM match_incidents ORDER BY id`
  );
  res.json(rows);
};

// ---------- GET by ID ----------
export const getMatchIncidentById = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const { rows } = await pool.query(
    `SELECT * FROM match_incidents WHERE id = $1`,
    [id]
  );

  if (!rows.length) throw new NotFoundError("Incident not found");
  res.json(rows[0]);
};

// ---------- CREATE ----------
export const createMatchIncidents = async (req: Request, res: Response) => {
  const body = Array.isArray(req.body) ? req.body : [req.body];
  if (!body.length) throw new BadRequestError("Empty payload");

  // Collect distinct match/team IDs for FK pre-check
  const matchIds = Array.from(
    new Set(
      body.map((it: any) => num(it?.cust_match_id)).filter((n) => Number.isFinite(n))
    )
  );
  const teamIds = Array.from(
    new Set(
      body.map((it: any) => num(it?.cust_team_id)).filter((n) => Number.isFinite(n))
    )
  );

  // FK checks: matches.cust_id
  const missingMatches = new Set<number>();
  if (matchIds.length) {
    const { rows } = await pool.query(
      `SELECT cust_id FROM matches WHERE cust_id = ANY($1::bigint[])`,
      [matchIds]
    );
    const have = new Set(rows.map((r) => Number(r.cust_id)));
    for (const id of matchIds) if (!have.has(id)) missingMatches.add(id);
  }

  // FK checks: teams.cust_id
  const missingTeams = new Set<number>();
  if (teamIds.length) {
    const { rows } = await pool.query(
      `SELECT cust_id FROM teams WHERE cust_id = ANY($1::bigint[])`,
      [teamIds]
    );
    const have = new Set(rows.map((r) => Number(r.cust_id)));
    for (const id of teamIds) if (!have.has(id)) missingTeams.add(id);
  }

  const inserted: any[] = [];
  const errors: Array<{ index: number; message: string }> = [];

  for (let i = 0; i < body.length; i++) {
    const it: any = body[i] ?? {};

    const cust_incident_id = numOrNull(it.cust_incident_id);
    const cust_match_id = num(it.cust_match_id);
    const cust_team_id = numOrNull(it.cust_team_id);
    const incident_type = it.incident_type;
    const type = it.type ?? null;
    const incident_class = it.incident_class ?? null;
    const description = it.description ?? null;
    const team_side = it.team_side ?? null;
    const time = numOrNull(it.time);
    const added_time = numOrNull(it.added_time);
    const period = it.period ?? null;
    const player_id = numOrNull(it.player_id);
    const assist_id = numOrNull(it.assist_id);
    const player_in_id = numOrNull(it.player_in_id);
    const player_out_id = numOrNull(it.player_out_id);
    const goalkeeper_id = numOrNull(it.goalkeeper_id);
    const home_score = numOrNull(it.home_score);
    const away_score = numOrNull(it.away_score);
    const goal_type = it.goal_type ?? null;
    const body_part = it.body_part ?? null;
    const details_json = it.details_json ?? null;

    // Validation
    if (!Number.isFinite(cust_match_id) || !incident_type) {
      errors.push({ index: i, message: "Missing required fields (cust_match_id, incident_type)" });
      continue;
    }
    if (missingMatches.has(cust_match_id)) {
      errors.push({ index: i, message: `Missing parent match: cust_id=${cust_match_id}` });
      continue;
    }
    if (cust_team_id && missingTeams.has(cust_team_id)) {
      errors.push({ index: i, message: `Missing parent team: cust_id=${cust_team_id}` });
      continue;
    }

    try {
      const { rows } = await pool.query(
        `
        INSERT INTO match_incidents (
          cust_incident_id, cust_match_id, cust_team_id,
          incident_type, type, incident_class, description,
          team_side, time, added_time, period,
          player_id, assist_id, player_in_id, player_out_id, goalkeeper_id,
          home_score, away_score, goal_type, body_part, details_json
        )
        VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,
          $12,$13,$14,$15,$16,$17,$18,$19,$20,$21
        )
        ON CONFLICT (cust_incident_id) DO UPDATE SET
          cust_team_id = EXCLUDED.cust_team_id,
          incident_type = EXCLUDED.incident_type,
          type = EXCLUDED.type,
          incident_class = EXCLUDED.incident_class,
          description = EXCLUDED.description,
          team_side = EXCLUDED.team_side,
          time = EXCLUDED.time,
          added_time = EXCLUDED.added_time,
          period = EXCLUDED.period,
          player_id = EXCLUDED.player_id,
          assist_id = EXCLUDED.assist_id,
          player_in_id = EXCLUDED.player_in_id,
          player_out_id = EXCLUDED.player_out_id,
          goalkeeper_id = EXCLUDED.goalkeeper_id,
          home_score = EXCLUDED.home_score,
          away_score = EXCLUDED.away_score,
          goal_type = EXCLUDED.goal_type,
          body_part = EXCLUDED.body_part,
          details_json = EXCLUDED.details_json
        RETURNING *
        `,
        [
          cust_incident_id, cust_match_id, cust_team_id,
          incident_type, type, incident_class, description,
          team_side, time, added_time, period,
          player_id, assist_id, player_in_id, player_out_id, goalkeeper_id,
          home_score, away_score, goal_type, body_part, details_json
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
export const updateMatchIncident = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const fields = req.body ?? {};
  const keys = Object.keys(fields);
  if (!keys.length) throw new BadRequestError("No fields provided");

  const setClauses = keys.map((k, i) => `${k} = $${i + 1}`).join(", ");
  const values = Object.values(fields);

  const { rows } = await pool.query(
    `UPDATE match_incidents SET ${setClauses} WHERE id = $${keys.length + 1} RETURNING *`,
    [...values, id]
  );

  if (!rows.length) throw new NotFoundError("Incident not found");
  res.json(rows[0]);
};

// ---------- DELETE by ID ----------
export const deleteMatchIncident = async (req: Request, res: Response) => {
  const id = num(req.params.id);
  if (!Number.isFinite(id)) throw new BadRequestError("Invalid id");

  const { rowCount } = await pool.query(
    `DELETE FROM match_incidents WHERE id = $1`,
    [id]
  );

  if (rowCount === 0) throw new NotFoundError("Incident not found");
  res.sendStatus(204);
};
