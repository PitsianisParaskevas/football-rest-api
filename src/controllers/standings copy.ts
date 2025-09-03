// src/controllers/standings.ts
import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/client";

// ==== EDIT THESE if your match_result column names differ ====
const MATCH_RESULT_COLS = {
  matchId: "match_cust_id", // e.g. "match_cust_id" or "cust_match_id"
  homeFT: "home_score_ft", // e.g. "home_score_ft" or "home_ft" or "home_ft_goals"
  awayFT: "away_score_ft", // e.g. "away_score_ft" or "away_ft" or "away_ft_goals"
} as const;
// =============================================================

// Build SQL once with your configured column names
const mr = MATCH_RESULT_COLS;
const STANDINGS_SQL = `
WITH scopes AS (
  SELECT 'ALL'::text AS scope UNION ALL
  SELECT 'HOME'      UNION ALL
  SELECT 'AWAY'
),
teams_in_tournament AS (
  SELECT tt.team_cust_id AS team_id, t.name, t.slug
  FROM tournament_team tt
  JOIN teams t ON t.cust_id = tt.team_cust_id
  WHERE tt.tournament_cust_id = $1
),
per_side AS (
  -- HOME rows
  SELECT
    m.tournament_id,
    m.home_team_id AS team_id,
    'home' AS side,
    COALESCE(r.${mr.homeFT}, 0) AS gf,
    COALESCE(r.${mr.awayFT}, 0) AS ga,
    CASE WHEN r.${mr.homeFT} > r.${mr.awayFT} THEN 1 ELSE 0 END AS w,
    CASE WHEN r.${mr.homeFT} = r.${mr.awayFT} THEN 1 ELSE 0 END AS d,
    CASE WHEN r.${mr.homeFT} < r.${mr.awayFT} THEN 1 ELSE 0 END AS l
  FROM matches m
  JOIN match_result r ON r.${mr.matchId} = m.cust_id
  WHERE m.tournament_id = $1

  UNION ALL

  -- AWAY rows
  SELECT
    m.tournament_id,
    m.away_team_id AS team_id,
    'away' AS side,
    COALESCE(r.${mr.awayFT}, 0) AS gf,
    COALESCE(r.${mr.homeFT}, 0) AS ga,
    CASE WHEN r.${mr.awayFT} > r.${mr.homeFT} THEN 1 ELSE 0 END AS w,
    CASE WHEN r.${mr.awayFT} = r.${mr.homeFT} THEN 1 ELSE 0 END AS d,
    CASE WHEN r.${mr.awayFT} < r.${mr.homeFT} THEN 1 ELSE 0 END AS l
  FROM matches m
  JOIN match_result r ON r.${mr.matchId} = m.cust_id
  WHERE m.tournament_id = $1
),
aggregated AS (
  SELECT 'ALL'::text AS scope, team_id,
         SUM(w + d + l) AS played,
         SUM(w) AS wins, SUM(d) AS draws, SUM(l) AS losses,
         SUM(gf) AS gf, SUM(ga) AS ga, SUM(gf) - SUM(ga) AS gd,
         SUM(w)*3 + SUM(d) AS pts
  FROM per_side
  GROUP BY team_id

  UNION ALL
  SELECT 'HOME', team_id,
         SUM(w + d + l), SUM(w), SUM(d), SUM(l),
         SUM(gf), SUM(ga), SUM(gf) - SUM(ga), SUM(w)*3 + SUM(d)
  FROM per_side WHERE side = 'home'
  GROUP BY team_id

  UNION ALL
  SELECT 'AWAY', team_id,
         SUM(w + d + l), SUM(w), SUM(d), SUM(l),
         SUM(gf), SUM(ga), SUM(gf) - SUM(ga), SUM(w)*3 + SUM(d)
  FROM per_side WHERE side = 'away'
  GROUP BY team_id
),
base AS (
  SELECT s.scope, tit.team_id, tit.name, tit.slug,
         COALESCE(a.played, 0) AS played,
         COALESCE(a.wins,   0) AS wins,
         COALESCE(a.draws,  0) AS draws,
         COALESCE(a.losses, 0) AS losses,
         COALESCE(a.gf,     0) AS gf,
         COALESCE(a.ga,     0) AS ga,
         COALESCE(a.gd,     0) AS gd,
         COALESCE(a.pts,    0) AS pts
  FROM scopes s
  CROSS JOIN teams_in_tournament tit
  LEFT JOIN aggregated a
    ON a.scope = s.scope AND a.team_id = tit.team_id
),
ranked AS (
  SELECT
    scope, team_id, name, slug,
    played, wins, draws, losses, gf, ga, gd, pts,
    RANK() OVER (PARTITION BY scope ORDER BY pts DESC, gd DESC, gf DESC, team_id ASC) AS position
  FROM base
)
SELECT
  scope,
  position,
  team_id        AS team_cust_id,
  name           AS team_name,
  slug           AS team_slug,
  played, wins, draws, losses, gf, ga, gd, pts
FROM ranked
ORDER BY scope, position, team_name;
`;

// Controller
export const getStandingsAllScopes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // supports /standings/:cust_id and /tournaments/:tournament_id/standings
    const idParam = req.params.cust_id ?? req.params.tournament_id;
    const tournamentId = Number(idParam);

    if (!Number.isFinite(tournamentId)) {
      res.status(400).json({ message: "Invalid tournament_id" });
      return;
    }

    const { rows } = await pool.query(STANDINGS_SQL, [tournamentId]);

    const ALL = rows
      .filter((r) => r.scope === "ALL")
      .map(({ scope, ...rest }) => rest);
    const HOME = rows
      .filter((r) => r.scope === "HOME")
      .map(({ scope, ...rest }) => rest);
    const AWAY = rows
      .filter((r) => r.scope === "AWAY")
      .map(({ scope, ...rest }) => rest);

    res.json({
      tournament_id: tournamentId,
      standings: { ALL, HOME, AWAY },
    });
  } catch (err) {
    next(err);
  }
};
