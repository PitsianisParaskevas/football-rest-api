import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

// helper function
// check if player exist to database
export async function findExistingPlayers(
  custIds: number[],
  slugs: string[]
): Promise<{ custIds: Set<number>; slugs: Set<string> }> {
  if (custIds.length === 0 && slugs.length === 0) {
    return { custIds: new Set(), slugs: new Set() };
  }

  const { rows } = await pool.query(
    `
    SELECT cust_id, slug
    FROM players
    WHERE (ARRAY_LENGTH($1::bigint[], 1) IS NOT NULL AND cust_id = ANY($1))
       OR (ARRAY_LENGTH($2::text[],  1) IS NOT NULL AND slug    = ANY($2))
    `,
    [custIds.length ? custIds : null, slugs.length ? slugs : null]
  );

  return {
    custIds: new Set(rows.map((r: any) => Number(r.cust_id))),
    slugs: new Set(
      rows.map((r: any) => (r.slug ?? "").trim()).filter((s: string) => s)
    ),
  };
}

// clean up numbers
const numOrNull = (v: any): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

// clean up arrays (remove dupes in responses)
function dedupeByKey<T>(arr: T[], keyFn: (t: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

// GET /players
export const getAllPlayers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const { rows } = await pool.query("SELECT * FROM players ORDER BY player_id");
  res.json(rows);
};

// GET /players/id/:id
export const getPlayerById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsedId = Number(req.params.id);
  if (isNaN(parsedId)) {
    throw new BadRequestError("Invalid player_id");
  }

  const { rows } = await pool.query(
    "SELECT * FROM players WHERE player_id = $1",
    [parsedId]
  );

  if (rows.length === 0) {
    throw new NotFoundError("Player not found");
  }

  res.json(rows[0]);
};

export const createPlayer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = Array.isArray(req.body) ? req.body : [req.body];
  if (body.length === 0) throw new BadRequestError("Empty payload");

  // Gather candidates to pre-check
  const custIds = Array.from(
    new Set(
      body
        .map((p) => Number(p?.cust_id))
        .filter((n) => Number.isFinite(n)) as number[]
    )
  );
  const slugs = Array.from(
    new Set(body.map((p) => (p?.slug ?? "").trim()).filter((s) => s.length > 0))
  );

  // DB pre-check (fast skip)
  const existingDB = await findExistingPlayers(custIds, slugs);

  const inserted: any[] = [];
  const existing: Array<{ cust_id: number; slug: string | null }> = [];

  for (const p of body) {
    const custIdNum = Number(p?.cust_id);
    const name = p?.name;
    const slug = (p?.slug ?? "").trim() || null;

    // minimal validation
    if (
      !Number.isFinite(custIdNum) ||
      typeof name !== "string" ||
      name.trim().length === 0
    ) {
      continue;
    }

    // skip if we already know it exists
    if (
      existingDB.custIds.has(custIdNum) ||
      (slug && existingDB.slugs.has(slug))
    ) {
      existing.push({ cust_id: custIdNum, slug });
      continue;
    }

    try {
      const { rows } = await pool.query(
        `
        INSERT INTO players (
          cust_id, name, slug, short_name, position, height,
          country_code, country_name, birthdate, current_team_cust_id,
          shirt_number, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6,
          $7, $8, $9, $10,
          $11, $12
        )
        ON CONFLICT DO NOTHING
        RETURNING *
        `,
        [
          custIdNum,
          name,
          slug,
          p?.short_name ?? null,
          p?.position ?? null,
          p?.height ?? null,
          p?.country_code ?? null,
          p?.country_name ?? null,
          p?.birthdate ?? null,
          p?.current_team_cust_id ?? null,
          p?.shirt_number ?? null,
          p?.updated_at ?? null,
        ]
      );

      if (rows.length) {
        inserted.push(rows[0]);
      } else {
        // conflict ignored by DO NOTHING → treat as existing
        existing.push({ cust_id: custIdNum, slug });
      }
    } catch (err: any) {
      // Fallback: if DB still throws unique violation (e.g., different constraint), don’t crash the batch
      if (err?.code === "23505") {
        existing.push({ cust_id: custIdNum, slug });
        continue;
      }
      throw err; // rethrow other errors
    }
  }

  res.status(inserted.length ? 201 : 200).json({ players: inserted, existing });
};

// PUT /players/id/:id  (full replace, mirrors matches:update)
export const updatePlayer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsedId = Number(req.params.id);
  if (isNaN(parsedId)) {
    throw new BadRequestError("Invalid player_id");
  }

  const {
    cust_id,
    name,
    slug = null,
    short_name = null,
    position = null,
    height = null,
    country_code = null,
    country_name = null,
    birthdate = null,
    current_team_cust_id = null,
    shirt_number = null,
    updated_at = null,
  } = req.body ?? {};

  const isValid =
    Number.isInteger(cust_id) && typeof name === "string" && name.length > 0;

  if (!isValid) {
    throw new BadRequestError("Invalid player fields");
  }

  const { rows } = await pool.query(
    `
    UPDATE players
    SET
      cust_id = $1,
      name = $2,
      slug = $3,
      short_name = $4,
      position = $5,
      height = $6,
      country_code = $7,
      country_name = $8,
      birthdate = $9,
      current_team_cust_id = $10,
      shirt_number = $11,
      updated_at = $12
    WHERE player_id = $13
    RETURNING *
    `,
    [
      cust_id,
      name,
      slug,
      short_name,
      position,
      height,
      country_code,
      country_name,
      birthdate,
      current_team_cust_id,
      shirt_number,
      updated_at,
      parsedId,
    ]
  );

  if (rows.length === 0) {
    throw new NotFoundError("Player not found");
  }

  res.status(200).json({ player: rows[0] });
};

// DELETE /players/id/:id
export const deletePlayer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const parsedId = Number(req.params.id);
  if (isNaN(parsedId)) {
    throw new BadRequestError("Invalid player_id");
  }

  const { rowCount } = await pool.query(
    "DELETE FROM players WHERE player_id = $1",
    [parsedId]
  );

  if (rowCount === 0) {
    throw new NotFoundError("Player not found");
  }

  res.sendStatus(204);
};

// GET /players/:slug/:cust_id
export const getAPlayer = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { slug, cust_id } = req.params;
  const cid = Number(cust_id);

  if (!slug || isNaN(cid)) {
    throw new BadRequestError("Invalid slug or cust_id");
  }

  const { rows } = await pool.query(
    `
    SELECT
      player_id, cust_id, name, slug, short_name, position, height,
      country_code, country_name, birthdate, current_team_cust_id,
      shirt_number, updated_at
    FROM players
    WHERE slug = $1 AND cust_id = $2
    `,
    [slug, cid]
  );

  if (rows.length === 0) {
    throw new NotFoundError("Player not found");
  }

  res.json(rows[0]);
};

export const getPlayersByTeam = async (req: Request, res: Response) => {
  const teamCustId = Number(req.params.team_cust_id);
  if (isNaN(teamCustId)) throw new BadRequestError("Invalid team_cust_id");

  const { rows } = await pool.query(
    `
    SELECT
      player_id, cust_id, name, slug, short_name, position, height,
      country_code, country_name, birthdate, current_team_cust_id,
      shirt_number, updated_at
    FROM players
    WHERE current_team_cust_id = $1
    ORDER BY name
    `,
    [teamCustId]
  );

  res.json(rows);
};
