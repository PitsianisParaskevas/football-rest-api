import type { Request, Response } from "express";
import { pool } from "../db/client";

// Get all scenarios
export const getAllScenarios = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const { rows } = await pool.query(
    `SELECT * FROM scenarios ORDER BY scenario_id`
  );
  res.json(rows);
};

// Create one or multiple scenarios
export const createScenario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];

  const inserted: any[] = [];
  const invalid: any[] = [];

  for (const payload of items) {
    const { name, team, category, script } = payload;

    const isValid =
      typeof name === "string" &&
      typeof team === "string" &&
      typeof category === "string" &&
      typeof script === "string";

    if (!isValid) {
      invalid.push(payload);
      continue;
    }

    const { rows } = await pool.query(
      `
      INSERT INTO scenarios (name, team, category, script)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [name, team, category, script]
    );

    inserted.push(rows[0]);
  }

  const response: Record<string, any> = {};
  if (inserted.length > 0) {
    response[inserted.length > 1 ? "scenarios" : "scenario"] =
      inserted.length > 1 ? inserted : inserted[0];
  }
  if (invalid.length > 0) {
    response.invalid = invalid;
  }

  res.status(201).json(response);
};

// Update a scenario by ID
export const updateScenario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { name, team, category, script } = req.body;

  const isValid =
    typeof name === "string" &&
    typeof team === "string" &&
    typeof category === "string" &&
    typeof script === "string";

  if (!isValid) {
    res.status(400).json({ message: "Invalid scenario fields" });
    return;
  }

  const { rows } = await pool.query(
    `
    UPDATE scenarios SET
      name = $1,
      team = $2,
      category = $3,
      script = $4
    WHERE scenario_id = $5
    RETURNING *
    `,
    [name, team, category, script, id]
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Scenario not found" });
    return;
  }

  res.json({ scenario: rows[0] });
};

// Delete a scenario by ID
export const deleteScenario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const { rowCount } = await pool.query(
    `DELETE FROM scenarios WHERE scenario_id = $1`,
    [id]
  );

  if (rowCount === 0) {
    res.status(404).json({ message: "Scenario not found" });
    return;
  }

  res.sendStatus(204);
};

export const getScenarioById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const scenarioId = Number(id);

  if (isNaN(scenarioId)) {
    res.status(400).json({ message: "Invalid scenario ID" });
    return;
  }

  const { rows } = await pool.query(
    `
    SELECT scenario_id, name, team, category, script
    FROM scenarios
    WHERE scenario_id = $1
    `,
    [scenarioId]
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Scenario not found" });
    return;
  }

  res.json(rows[0]);
};
