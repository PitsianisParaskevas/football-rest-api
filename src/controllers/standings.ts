// src/controllers/standings.ts
import type { Request, Response, NextFunction } from "express";
import { pool } from "../db/client";

const MATCH_RESULT_COLS = {
  matchId: "match_cust_id",
  homeFT:  "home_score_ft",
  awayFT:  "away_score_ft",
} as const;

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
  SELECT m.tournament_id, m.home_team_id AS team_id, 'home' AS side,
         COALESCE(r.${mr.homeFT},0) AS gf, COALESCE(r.${mr.awayFT},0) AS ga,
         (r.${mr.homeFT} > r.${mr.awayFT})::int AS w,
         (r.${mr.homeFT} = r.${mr.awayFT})::int AS d,
         (r.${mr.homeFT} < r.${mr.awayFT})::int AS l
  FROM matches m
  JOIN match_result r ON r.${mr.matchId} = m.cust_id
  WHERE m.tournament_id = $1
  UNION ALL
  SELECT m.tournament_id, m.away_team_id AS team_id, 'away' AS side,
         COALESCE(r.${mr.awayFT},0) AS gf, COALESCE(r.${mr.homeFT},0) AS ga,
         (r.${mr.awayFT} > r.${mr.homeFT})::int AS w,
         (r.${mr.awayFT} = r.${mr.homeFT})::int AS d,
         (r.${mr.awayFT} < r.${mr.homeFT})::int AS l
  FROM matches m
  JOIN match_result r ON r.${mr.matchId} = m.cust_id
  WHERE m.tournament_id = $1
),
aggregated AS (
  SELECT 'ALL'::text AS scope, team_id,
         SUM(w+d+l) played, SUM(w) wins, SUM(d) draws, SUM(l) losses,
         SUM(gf) gf, SUM(ga) ga, SUM(gf)-SUM(ga) gd, SUM(w)*3+SUM(d) pts
  FROM per_side GROUP BY team_id
  UNION ALL
  SELECT 'HOME', team_id,
         SUM(w+d+l), SUM(w), SUM(d), SUM(l),
         SUM(gf), SUM(ga), SUM(gf)-SUM(ga), SUM(w)*3+SUM(d)
  FROM per_side WHERE side='home' GROUP BY team_id
  UNION ALL
  SELECT 'AWAY', team_id,
         SUM(w+d+l), SUM(w), SUM(d), SUM(l),
         SUM(gf), SUM(ga), SUM(gf)-SUM(ga), SUM(w)*3+SUM(d)
  FROM per_side WHERE side='away' GROUP BY team_id
),
base AS (
  SELECT s.scope, tit.team_id, tit.name, tit.slug,
         COALESCE(a.played,0) played, COALESCE(a.wins,0) wins,
         COALESCE(a.draws,0) draws, COALESCE(a.losses,0) losses,
         COALESCE(a.gf,0) gf, COALESCE(a.ga,0) ga,
         COALESCE(a.gd,0) gd, COALESCE(a.pts,0) pts
  FROM scopes s
  CROSS JOIN teams_in_tournament tit
  LEFT JOIN aggregated a ON a.scope=s.scope AND a.team_id=tit.team_id
),
ranked AS (
  SELECT scope, team_id, name, slug,
         played, wins, draws, losses, gf, ga, gd, pts,
         RANK() OVER (PARTITION BY scope ORDER BY pts DESC, gd DESC, gf DESC, team_id ASC) position
  FROM base
),
team_matches AS (
  SELECT m.cust_id AS match_cust_id, m.match_date, m.home_team_id AS team_id,
         CASE WHEN r.${mr.homeFT} > r.${mr.awayFT} THEN 'W'
              WHEN r.${mr.homeFT} = r.${mr.awayFT} THEN 'D'
              ELSE 'L' END AS result
  FROM matches m
  JOIN match_result r ON r.${mr.matchId} = m.cust_id
  WHERE m.tournament_id = $1
  UNION ALL
  SELECT m.cust_id AS match_cust_id, m.match_date, m.away_team_id AS team_id,
         CASE WHEN r.${mr.awayFT} > r.${mr.homeFT} THEN 'W'
              WHEN r.${mr.awayFT} = r.${mr.homeFT} THEN 'D'
              ELSE 'L' END AS result
  FROM matches m
  JOIN match_result r ON r.${mr.matchId} = m.cust_id
  WHERE m.tournament_id = $1
),
form5 AS (
  SELECT tit.team_id,
         COALESCE((
           SELECT array_agg(s.result ORDER BY s.match_date DESC, s.match_cust_id DESC)
           FROM (
             SELECT tm.result, tm.match_date, tm.match_cust_id
             FROM team_matches tm
             WHERE tm.team_id = tit.team_id
             ORDER BY tm.match_date DESC, tm.match_cust_id DESC
             LIMIT 5
           ) s
         ), ARRAY[]::text[]) AS form
  FROM teams_in_tournament tit
)
SELECT
  r.scope,
  r.position,
  r.team_id  AS team_cust_id,
  r.name     AS team_name,
  r.slug     AS team_slug,
  r.played, r.wins, r.draws, r.losses,
  r.gf, r.ga, r.gd, r.pts,
  f.form     AS form
FROM ranked r
LEFT JOIN form5 f ON f.team_id = r.team_id
ORDER BY r.scope, r.position, r.name;  -- <-- fixed
`;

export const getStandingsAllScopes = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const idParam = req.params.cust_id ?? req.params.tournament_id;
    const tournamentId = Number(idParam);
    if (!Number.isFinite(tournamentId)) {
      res.status(400).json({ message: "Invalid tournament_id" });
      return;
    }

    const { rows } = await pool.query(STANDINGS_SQL, [tournamentId]);

    const ALL  = rows.filter(r => r.scope === "ALL").map(({ scope, ...rest }) => rest);
    const HOME = rows.filter(r => r.scope === "HOME").map(({ scope, ...rest }) => rest);
    const AWAY = rows.filter(r => r.scope === "AWAY").map(({ scope, ...rest }) => rest);

    res.json({ tournament_id: tournamentId, standings: { ALL, HOME, AWAY } });
  } catch (err) {
    next(err);
  }
};
