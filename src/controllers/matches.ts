import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

export const getAllMatches = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const { rows } = await pool.query("SELECT * FROM matches ORDER BY match_id");
  res.json(rows);
};

export const createMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = Array.isArray(req.body) ? req.body : [req.body];
  const inserted: any[] = [];

  for (const match of body) {
    const {
      tournament_id,
      cust_id,
      round,
      match_date,
      home_team_id,
      away_team_id,
    } = match;

    const isValid =
      Number.isInteger(tournament_id) &&
      Number.isInteger(cust_id) &&
      Number.isInteger(round) &&
      typeof match_date === "string" &&
      Number.isInteger(home_team_id) &&
      Number.isInteger(away_team_id);

    if (!isValid) {
      throw new BadRequestError("Invalid match fields");
    }

    const { rows } = await pool.query(
      `
      INSERT INTO matches
        (tournament_id, cust_id, round, match_date, home_team_id, away_team_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [tournament_id, cust_id, round, match_date, home_team_id, away_team_id]
    );

    inserted.push(rows[0]);
  }

  res
    .status(201)
    .json(inserted.length > 1 ? { matches: inserted } : { match: inserted[0] });
};

export const updateMatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { match_id } = req.params;
  const {
    tournament_id,
    cust_id,
    round,
    match_date,
    home_team_id,
    away_team_id,
  } = req.body;

  const parsedMatchId = Number(match_id);

    const isValid =
      !isNaN(parsedMatchId) &&
      Number.isInteger(tournament_id) &&
      Number.isInteger(cust_id) &&
      Number.isInteger(round) &&
      home_team_id &&
      away_team_id;

    if (!isValid) {
      throw new BadRequestError("Invalid match fields");
    }

  const { rows } = await pool.query(
    `
    UPDATE matches
    SET
      tournament_id = $1,
      cust_id = $2,
      round = $3,
      match_date = $4,
      home_team_id = $5,
      away_team_id = $6
    WHERE match_id = $7
    RETURNING *
    `,
    [
      tournament_id,
      cust_id,
      round,
      match_date,
      home_team_id,
      away_team_id,
      parsedMatchId,
    ]
  );

  if (rows.length === 0) {
    throw new NotFoundError("Match not found");
  }

  res.status(200).json({ match: rows[0] });
};

export const deleteMatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { match_id } = req.params;
  const parsedMatchId = Number(match_id);

  if (isNaN(parsedMatchId)) {
    throw new BadRequestError("Invalid match_id");
  }

  const { rowCount } = await pool.query(
    `DELETE FROM matches WHERE match_id = $1`,
    [parsedMatchId]
  );

  if (rowCount === 0) {
    throw new NotFoundError("Match not found");
  }

  res.sendStatus(204);
};
