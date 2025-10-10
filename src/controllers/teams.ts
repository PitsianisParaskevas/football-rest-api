import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/client.ts";

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

export const getTeamStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const teamId = Number(req.params.id);
    if (Number.isNaN(teamId)) {
      res.status(400).json({ message: "Invalid teamId" });
      return;
    }

    const phase = String(req.query.phase || "ALL");
    const tournamentId = req.query.tournamentId
      ? Number(req.query.tournamentId)
      : null;
    const pivot = String(req.query.pivot || "false") === "true";

    // ΠΑΝΤΑ δίνουμε 3ο param (ακόμα και null) για να ταιριάζει το $3
    const params: any[] = [teamId, phase, tournamentId];

    const sql = `
      WITH base AS (
        SELECT
          ms.team_cust_id,
          ms.team_side,
          ms.stat_key,
          COUNT(DISTINCT ms.match_cust_id) AS games_played,
          SUM(ms.value) AS total_value
        FROM public.match_stats ms
        WHERE ms.team_cust_id = $1
          AND ms.phase = $2
          AND (
            $3::bigint IS NULL
            OR ms.match_cust_id IN (
              SELECT m.cust_id
              FROM public.matches m
              WHERE m.tournament_id = $3
            )
          )
        GROUP BY ms.team_cust_id, ms.team_side, ms.stat_key
      ),
      unioned AS (
        SELECT * FROM base
        UNION ALL
        SELECT
          team_cust_id,
          'total' AS team_side,
          stat_key,
          SUM(games_played) AS games_played,
          SUM(total_value) AS total_value
        FROM base
        GROUP BY team_cust_id, stat_key
      )
      SELECT
        stat_key,
        team_side,
        total_value,
        games_played,
        ROUND((total_value / NULLIF(games_played, 0))::numeric, 2) AS per_game
      FROM unioned
      ORDER BY stat_key, team_side;
    `;

    const { rows } = await pool.query(sql, params);

    if (!pivot) {
      res.json({ teamId, phase, stats: rows });
      return;
    }

    // pivot: μία γραμμή ανά stat_key
    const byKey: Record<string, any> = {};
    for (const r of rows) {
      const key = r.stat_key;
      if (!byKey[key]) byKey[key] = { stat_key: key };
      byKey[key][`${r.team_side}_total`] =
        r.total_value !== null ? Number(r.total_value) : null;
      byKey[key][`${r.team_side}_games`] =
        r.games_played !== null ? Number(r.games_played) : null;
      byKey[key][`${r.team_side}_per_game`] =
        r.per_game !== null ? Number(r.per_game) : null;
    }

    res.json({ teamId, phase, stats: Object.values(byKey) });
  } catch (err) {
    console.error("❌ Error fetching team stats:", err);
    res.status(500).json({ message: "Server Error" });
  }
};

const TEAM_PERSPECTIVE_SQL = `
-- $1 = team_id
-- $2 = tournament_id (nullable)
WITH base AS (
  SELECT 
    m.cust_id,
    m.tournament_id,
    m.round,
    m.match_date,
    m.home_team_id,
    m.away_team_id,
    r.home_score_ft,
    r.away_score_ft,
    r.home_score_ht,
    r.away_score_ht,
    r.home_formation,
    r.away_formation
  FROM matches m
  LEFT JOIN match_result r ON r.match_cust_id = m.cust_id
 WHERE ($2::int IS NULL OR m.tournament_id = $2::int)
    AND ($1 = m.home_team_id OR $1 = m.away_team_id)
),
perspective AS (
  -- HOME perspective
  SELECT
    b.cust_id              AS match_cust_id,
    b.tournament_id,
    b.round,
    b.match_date,
    'HOME'::text           AS venue,
    b.home_team_id         AS team_id,
    b.away_team_id         AS opponent_id,
    b.home_score_ft        AS gf,
    b.away_score_ft        AS ga,
    b.home_score_ht        AS gf_ht,
    b.away_score_ht        AS ga_ht,
    b.home_formation       AS team_formation,
    b.away_formation       AS opponent_formation,
    CASE
      WHEN b.home_score_ft IS NULL OR b.away_score_ft IS NULL THEN NULL
      WHEN b.home_score_ft > b.away_score_ft THEN 'W'
      WHEN b.home_score_ft = b.away_score_ft THEN 'D'
      ELSE 'L'
    END                    AS result,
    CASE
      WHEN b.home_score_ft IS NULL OR b.away_score_ft IS NULL THEN NULL
      WHEN b.home_score_ft > b.away_score_ft THEN 3
      WHEN b.home_score_ft = b.away_score_ft THEN 1
      ELSE 0
    END                    AS points
  FROM base b
  WHERE b.home_team_id = $1

  UNION ALL

  -- AWAY perspective
  SELECT
    b.cust_id,
    b.tournament_id,
    b.round,
    b.match_date,
    'AWAY',
    b.away_team_id,
    b.home_team_id,
    b.away_score_ft,
    b.home_score_ft,
    b.away_score_ht,
    b.home_score_ht,
    b.away_formation,
    b.home_formation,
    CASE
      WHEN b.home_score_ft IS NULL OR b.away_score_ft IS NULL THEN NULL
      WHEN b.away_score_ft > b.home_score_ft THEN 'W'
      WHEN b.away_score_ft = b.home_score_ft THEN 'D'
      ELSE 'L'
    END,
    CASE
      WHEN b.home_score_ft IS NULL OR b.away_score_ft IS NULL THEN NULL
      WHEN b.away_score_ft > b.home_score_ft THEN 3
      WHEN b.away_score_ft = b.home_score_ft THEN 1
      ELSE 0
    END
  FROM base b
  WHERE b.away_team_id = $1
)
SELECT 
  p.match_cust_id,
  p.tournament_id,
  p.round,
  p.match_date,
  p.venue,
  p.team_id,
  t1.name AS team_name,
  p.opponent_id,
  t2.name AS opponent_name,
  p.gf, p.ga,
  p.gf_ht, p.ga_ht,
  p.result,
  p.points,
  p.team_formation,
  p.opponent_formation
FROM perspective p
LEFT JOIN teams t1 ON t1.cust_id = p.team_id
LEFT JOIN teams t2 ON t2.cust_id = p.opponent_id
ORDER BY p.match_date ASC, p.match_cust_id ASC;
`;

export async function listTeamMatches(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const teamIdRaw = req.params.team_id ?? req.query.team_id;
    const tournamentIdRaw =
      req.params.tournament_id ?? req.query.tournament_id ?? null;

    const teamId = Number(teamIdRaw);
    const tournamentId =
      tournamentIdRaw === null ? null : Number(tournamentIdRaw);

    if (!Number.isFinite(teamId)) {
      res.status(400).json({ message: "Invalid team_id" });
      return;
    }
    if (tournamentIdRaw !== null && !Number.isFinite(tournamentId)) {
      res.status(400).json({ message: "Invalid tournament_id" });
      return;
    }

    const { rows } = await pool.query(TEAM_PERSPECTIVE_SQL, [
      teamId,
      tournamentId,
    ]);

    res.json({
      team_id: teamId,
      tournament_id: tournamentId,
      count: rows.length,
      matches: rows,
    });
  } catch (err) {
    next(err);
  }
}
