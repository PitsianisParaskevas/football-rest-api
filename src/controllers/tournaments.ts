import type { Request, Response } from "express";
import { pool } from "../db/client";

export const getAllTournaments = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const { rows } = await pool.query("SELECT * FROM tournaments ORDER BY id");
  res.json(rows);
};

export const createTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];
  const inserted: any[] = [];

  const invalid: any[] = [];

  for (const payload of items) {
    const {
      cust_id,
      name,
      slug,
      countryName,
      countrySlug,
      rounds,
      total_teams,
    } = payload;

    const isValid =
      typeof cust_id === "number" &&
      typeof name === "string" &&
      typeof slug === "string" &&
      typeof countryName === "string" &&
      typeof countrySlug === "string" &&
      typeof rounds === "number" &&
      typeof total_teams === "number";

    if (!isValid) {
      invalid.push(payload);
      continue;
    }

    const { rows } = await pool.query(
      `
      INSERT INTO tournaments
        (cust_id, name, slug, country_name, country_slug, rounds, total_teams)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `,
      [cust_id, name, slug, countryName, countrySlug, rounds, total_teams]
    );

    inserted.push(rows[0]);
  }

  const response: Record<string, any> = {};
  if (inserted.length > 0) {
    response[inserted.length > 1 ? "tournaments" : "tournament"] =
      inserted.length > 1 ? inserted : inserted[0];
  }
  if (invalid.length > 0) {
    response.invalid = invalid;
  }

  res.status(201).json(response);
};

export const updateTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const { cust_id, name, slug, countryName, countrySlug, rounds, total_teams } =
    req.body;

  const isValid =
    typeof cust_id === "number" &&
    typeof name === "string" &&
    typeof slug === "string" &&
    typeof countryName === "string" &&
    typeof countrySlug === "string" &&
    typeof rounds === "number" &&
    typeof total_teams === "number";

  if (!isValid) {
    res.status(400).json({ message: "Invalid tournament fields" });
    return;
  }

  const { rows } = await pool.query(
    `
    UPDATE tournaments SET
      cust_id = $1,
      name = $2,
      slug = $3,
      country_name = $4,
      country_slug = $5,
      rounds = $6,
      total_teams = $7
    WHERE id = $8
    RETURNING *
  `,
    [cust_id, name, slug, countryName, countrySlug, rounds, total_teams, id]
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  res.json({ tournament: rows[0] });
};

export const deleteTournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const { rowCount } = await pool.query(
    "DELETE FROM tournaments WHERE id = $1",
    [id]
  );

  if (rowCount === 0) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  res.sendStatus(204); // No Content
};

export const getATournament = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { slug, cust_id } = req.params;
  const cid = Number(cust_id);

  if (!slug || isNaN(cid)) {
    res.status(400).json({ message: "Invalid slug or cust_id" });
    return;
  }

  const { rows } = await pool.query(
    `
    SELECT id, cust_id, name, slug, country_name AS "countryName",
           country_slug AS "countrySlug", rounds, total_teams
    FROM tournaments
    WHERE slug = $1 AND cust_id = $2
    `,
    [slug, cid]
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Tournament not found" });
    return;
  }

  res.json(rows[0]);
};
