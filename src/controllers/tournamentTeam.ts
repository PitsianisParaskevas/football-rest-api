// src/controllers/tournamentTeam.ts
import type { Request, Response } from "express";
import { pool } from "../db/clinet";

import { NotFoundError } from "../errors/NotFoundError";
import { BadRequestError } from "../errors/BadRequestError";

// GET /tournament-teams
export const getAllTournamentTeams = async (_req: Request, res: Response) => {
  const { rows } = await pool.query(`
    SELECT tournament_cust_id, team_cust_id FROM tournament_team
  `);
  res.json(rows);
};

// POST /tournament-teams
export const createTeamToTournament = async (req: Request, res: Response) => {
  const body = Array.isArray(req.body) ? req.body : [req.body];
  const inserted: any[] = [];

  for (const { tournament_cust_id, team_cust_id } of body) {
    if (
      !Number.isInteger(tournament_cust_id) ||
      !Number.isInteger(team_cust_id)
    ) {
      res
        .status(400)
        .json({ message: "Invalid tournament_cust_id or team_cust_id" });
      return;
    }

    const { rows } = await pool.query(
      `
      INSERT INTO tournament_team (tournament_cust_id, team_cust_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      RETURNING *
      `,
      [tournament_cust_id, team_cust_id]
    );

    if (rows.length > 0) inserted.push(rows[0]);
  }

  res
    .status(201)
    .json(
      inserted.length > 1 ? { mappings: inserted } : { mapping: inserted[0] }
    );
};

// PUT /tournament-teams/:id
// PUT /tournament-teams/:tournament_cust_id/:team_cust_id
export const updateTeamToTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { tournament_cust_id: oldTournamentId, team_cust_id: oldTeamId } =
    req.params;
  const { tournament_cust_id: newTournamentId, team_cust_id: newTeamId } =
    req.body;

  if (
    isNaN(Number(oldTournamentId)) ||
    isNaN(Number(oldTeamId)) ||
    !Number.isInteger(newTournamentId) ||
    !Number.isInteger(newTeamId)
  ) {
    throw new BadRequestError("Invalid IDs");
  }

  const { rows } = await pool.query(
    `
    UPDATE tournament_team
    SET tournament_cust_id = $1, team_cust_id = $2
    WHERE tournament_cust_id = $3 AND team_cust_id = $4
    RETURNING *
    `,
    [newTournamentId, newTeamId, Number(oldTournamentId), Number(oldTeamId)]
  );

  if (rows.length === 0) {
    throw new NotFoundError("Mapping not found");
  }

  res.status(200).json({ mapping: rows[0] });
};

// DELETE /tournament-teams/:tournament_cust_id/:team_cust_id
export const removeTeamFromTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { tournament_cust_id, team_cust_id } = req.params;

  const tournamentId = Number(tournament_cust_id);
  const teamId = Number(team_cust_id);

  if (isNaN(tournamentId) || isNaN(teamId)) {
    res
      .status(400)
      .json({ message: "Invalid tournament_cust_id or team_cust_id" });
    return; // 🛠️ This was missing
  }

  try {
    const { rowCount } = await pool.query(
      `
      DELETE FROM tournament_team
      WHERE tournament_cust_id = $1 AND team_cust_id = $2
      `,
      [tournamentId, teamId]
    );

    if (rowCount === 0) {
      res.status(404).json({ message: "Mapping not found" });
      return; // 🛠️ Prevent further execution
    }

    res.sendStatus(204); // ✅ Deletion success
  } catch (err) {
    console.error("❌ Error deleting mapping:", err);
    res.status(500).json({ message: "Server Error" });
  }
};
