import type { Request, Response } from "express";
import { pool } from "../db/clinet";

export const getAllTeams = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const { rows } = await pool.query(`
      SELECT *
      FROM teams
      ORDER BY id
    `);

    res.json(rows);
  } catch (err) {
    console.error("❌ Error fetching teams:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

export const createTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = req.body;
  const teams = Array.isArray(body) ? body : [body]; // normalize single vs multiple

  const inserted: any[] = [];

  try {
    for (const payload of teams) {
      const {
        cust_id,
        name,
        slug,
        shortName,
        nameCode,
        countryName,
        countrySlug,
      } = payload;

      // Validate required fields
      if (
        typeof cust_id !== "number" ||
        typeof name !== "string" ||
        typeof slug !== "string" ||
        typeof shortName !== "string" ||
        typeof nameCode !== "string" ||
        typeof countryName !== "string" ||
        typeof countrySlug !== "string"
      ) {
        res.status(400).json({ message: "Invalid team fields", payload });
        return;
      }

      const { rows } = await pool.query(
        `
        INSERT INTO teams
          (cust_id, name, slug, short_name, name_code, country_name, country_slug)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
        [cust_id, name, slug, shortName, nameCode, countryName, countrySlug]
      );

      inserted.push(rows[0]);
    }

    res
      .status(201)
      .json(inserted.length > 1 ? { teams: inserted } : { team: inserted[0] });
  } catch (err: any) {
    if (err.code === "23505") {
      res.status(409).json({ message: "Duplicate entry", detail: err.detail });
    } else {
      console.error("❌ Error inserting teams:", err);
      res.status(500).json({ message: "Server Error" });
    }
  }
};

export const updateTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;
  const {
    cust_id,
    name,
    slug,
    short_name,
    name_code,
    country_name,
    country_slug,
  } = req.body;

  const parsedCustId = Number(cust_id);

  const isValid =
    !isNaN(parsedCustId) &&
    typeof name === "string" &&
    typeof slug === "string" &&
    typeof short_name === "string" &&
    typeof name_code === "string" &&
    typeof country_name === "string" &&
    typeof country_slug === "string";

  if (!isValid) {
    res.status(400).json({ message: "Invalid team fields" });
    return;
  }

  const { rows } = await pool.query(
    `
    UPDATE teams SET
      cust_id = $1,
      name = $2,
      slug = $3,
      short_name = $4,
      name_code = $5,
      country_name = $6,
      country_slug = $7
    WHERE id = $8
    RETURNING *
  `,
    [
      parsedCustId,
      name,
      slug,
      short_name,
      name_code,
      country_name,
      country_slug,
      id,
    ]
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Team not found" });
    return;
  }

  res.json({ team: rows[0] });
};

export const deleteTeam = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const { rowCount } = await pool.query("DELETE FROM teams WHERE id = $1", [
    id,
  ]);

  if (rowCount === 0) {
    res.status(404).json({ message: "Team not found" });
    return;
  }

  res.sendStatus(204);
};

export const getATeam = async (req: Request, res: Response): Promise<void> => {
  const { slug, cust_id } = req.params;
  const cid = Number(cust_id);

  if (!slug || isNaN(cid)) {
    res.status(400).json({ message: "Invalid slug or cust_id" });
    return;
  }

  const { rows } = await pool.query(
    `
     SELECT id, cust_id, name, slug, short_name AS "shortName", name_code AS "nameCode",
         country_name AS "countryName", country_slug AS "countrySlug"
  FROM teams
    WHERE slug = $1 AND cust_id = $2
  `,
    [slug, cid]
  );

  if (rows.length === 0) {
    res.status(404).json({ message: "Team not found" });
    return;
  }

  res.json(rows[0]);
};
