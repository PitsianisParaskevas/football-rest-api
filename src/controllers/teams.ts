import type { NextFunction, Request, Response } from "express";
import { pool } from "../db/client.ts";
import { findStatNames } from "@/functions/helper/findStatName.ts";

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

// controllers/teams/getTeamStats (safe, χωρίς phase)

type RowOut = {
  stat_key: string;
  group: string | null;
  view_name: string | null;
  total_value: number | null;
  games_played: number | null;
  per_game: number | null;
};

export const getTeamStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const teamId = Number(req.params.teamId ?? req.params.id);
    if (!Number.isFinite(teamId)) {
      res.status(400).json({ message: "Invalid teamId" });
      return;
    }

    const tournamentId = req.query.tournamentId
      ? Number(req.query.tournamentId)
      : null;
    const params: any[] = [teamId, tournamentId];

    const sql = `
      WITH base AS (
        SELECT
          ms.team_cust_id,
          ms.team_side,                                -- 'home' | 'away'
          ms.stat_key,
          COUNT(DISTINCT ms.match_cust_id)::int AS games_played,
          SUM(ms.value)::float8 AS total_value
        FROM public.match_stats ms
        WHERE ms.team_cust_id = $1
          AND (
            $2::bigint IS NULL
            OR ms.match_cust_id IN (
              SELECT m.cust_id
              FROM public.matches m
              WHERE m.tournament_id = $2
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
          SUM(games_played)::int   AS games_played,
          SUM(total_value)::float8 AS total_value
        FROM base
        GROUP BY team_cust_id, stat_key
      )
      SELECT
        stat_key,
        team_side,                                     -- 'home' | 'away' | 'total'
        total_value,
        games_played,
        ROUND((total_value / NULLIF(games_played, 0))::numeric, 2)::float8 AS per_game
      FROM unioned
      ORDER BY
        stat_key,
        CASE
          WHEN team_side = 'total' THEN 1
          WHEN team_side = 'home'  THEN 2
          WHEN team_side = 'away'  THEN 3
          ELSE 4
        END;
    `;

    const { rows } = await pool.query(sql, params);

    // Αν δεν υπάρχει δεδομένο, γύρνα κενή δομή
    if (!rows.length) {
      res.json({
        teamId,
        standings: { ALL: {}, HOME: {}, AWAY: {} },
      });
      return;
    }

    // Παίρνουμε metadata για όλα τα keys μία φορά
    const statKeys = Array.from(new Set(rows.map(r => r.stat_key)));
    const metaMap = await findStatNames(statKeys); // { key -> { group, view_name } }

    // Ομαδοποιημένα ΜΕΣΑ στο standings
    const standings: {
      ALL: Record<string, RowOut[]>;
      HOME: Record<string, RowOut[]>;
      AWAY: Record<string, RowOut[]>;
    } = { ALL: {}, HOME: {}, AWAY: {} };

    for (const r of rows) {
      const bucket =
        r.team_side === "total" ? "ALL" :
        r.team_side === "home"  ? "HOME" : "AWAY";

      const meta = metaMap[r.stat_key] ?? null;

      const item: RowOut = {
        stat_key: r.stat_key,
        group: meta?.group ?? null,
        view_name: meta?.view_name ?? null,
        total_value: r.total_value !== null ? Number(r.total_value) : null,
        games_played: r.games_played !== null ? Number(r.games_played) : null,
        per_game: r.per_game !== null ? Number(r.per_game) : null,
      };

      const groupKey =
        (item.group && item.group.trim()) ? item.group.trim() : "Ungrouped";

      if (!standings[bucket][groupKey]) standings[bucket][groupKey] = [];
      standings[bucket][groupKey].push(item);
    }

    // Ταξινόμηση μέσα σε κάθε group κατά view_name (fallback stat_key)
    const sortFn = (a: RowOut, b: RowOut) =>
      (a.view_name ?? a.stat_key).localeCompare(b.view_name ?? b.stat_key);

    for (const bucket of ["ALL", "HOME", "AWAY"] as const) {
      for (const g of Object.keys(standings[bucket])) {
        standings[bucket][g].sort(sortFn);
      }
    }

    res.json({ teamId, standings });
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
  t2.slug AS opponent_slug,
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

const METRICS = [
  "rating_avg",
  "goals",
  "assists",
  "xg",
  "xa",
  "xg_diff",
  "xa_diff",
  "key_passes",
  "prog_passes",
  "dribbles_succ",
  "pressures_won",
  "interceptions",
  "tackles",
  "pass_accuracy",
  "minutes",
  "appearances",
  "motm",
  "cards_yellow",
  "cards_red",
];

export async function getTeamPlayerStats(req: Request, res: Response) {
  const teamId = Number(req.params.id); // cust_id
  if (!Number.isFinite(teamId)) {
    res.status(400).json({ message: "Invalid team id" });
    return;
  }

  const sql = `
    WITH matches_scope AS (
      SELECT m.match_id, m.tournament_id, m.home_team_id, m.away_team_id
      FROM matches m
      WHERE ($1 = m.home_team_id OR $1 = m.away_team_id)
    ),
    base AS (
      SELECT
        mps.match_id,
        mps.player_id,
        mps.rating,
        mps.goals, mps.assists, mps.xg, mps.xa,
        mps.key_passes, mps.progressive_passes, mps.dribbles_succ,
        mps.pressures_won, mps.interceptions, mps.tackles,
        mps.passes_completed, mps.passes_attempted,
        mps.yellow_cards, mps.red_cards,
        mpi.minutes_played,
        CASE
          WHEN mps.rating IS NOT NULL
           AND mps.rating = MAX(mps.rating) OVER (PARTITION BY mps.match_id)
          THEN 1 ELSE 0
        END AS motm_flag
      FROM match_player_stats mps
      JOIN match_player_info mpi
        ON mpi.match_id = mps.match_id AND mpi.player_id = mps.player_id
      WHERE mps.match_id IN (SELECT match_id FROM matches_scope)
    ),
    agg AS (
      SELECT
        b.player_id,
        AVG(b.rating)::float8 AS rating_avg,
        SUM(b.goals)::int AS goals,
        SUM(b.assists)::int AS assists,
        SUM(b.xg)::float8 AS xg,
        SUM(b.xa)::float8 AS xa,
        SUM(b.xg)::float8 - SUM(b.goals)::float8 AS xg_diff,
        SUM(b.xa)::float8 - SUM(b.assists)::float8 AS xa_diff,
        SUM(b.key_passes)::int AS key_passes,
        SUM(b.progressive_passes)::int AS prog_passes,
        SUM(b.dribbles_succ)::int AS dribbles_succ,
        SUM(b.pressures_won)::int AS pressures_won,
        SUM(b.interceptions)::int AS interceptions,
        SUM(b.tackles)::int AS tackles,
        CASE WHEN SUM(b.passes_attempted)=0 THEN NULL
             ELSE 100.0*SUM(b.passes_completed)/SUM(b.passes_attempted)
        END::float8 AS pass_accuracy,
        SUM(b.minutes_played)::int AS minutes,
        COUNT(DISTINCT b.match_id)::int AS appearances,
        SUM(b.motm_flag)::int AS motm,
        SUM(b.yellow_cards)::int AS cards_yellow,
        SUM(b.red_cards)::int AS cards_red
      FROM base b
      GROUP BY b.player_id
    ),
    ranked AS (
      SELECT
        'rating_avg' AS metric, player_id, rating_avg AS value FROM (
          SELECT player_id, rating_avg,
                 ROW_NUMBER() OVER (ORDER BY rating_avg DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
          FROM agg
        ) s WHERE rn = 1
      UNION ALL
      SELECT 'goals', player_id, goals::float8 FROM (
        SELECT player_id, goals,
               ROW_NUMBER() OVER (ORDER BY goals DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'assists', player_id, assists::float8 FROM (
        SELECT player_id, assists,
               ROW_NUMBER() OVER (ORDER BY assists DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'xg', player_id, xg FROM (
        SELECT player_id, xg,
               ROW_NUMBER() OVER (ORDER BY xg DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'xa', player_id, xa FROM (
        SELECT player_id, xa,
               ROW_NUMBER() OVER (ORDER BY xa DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'xg_diff', player_id, xg_diff FROM (
        SELECT player_id, xg_diff,
               ROW_NUMBER() OVER (ORDER BY xg_diff DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'xa_diff', player_id, xa_diff FROM (
        SELECT player_id, xa_diff,
               ROW_NUMBER() OVER (ORDER BY xa_diff DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'key_passes', player_id, key_passes::float8 FROM (
        SELECT player_id, key_passes,
               ROW_NUMBER() OVER (ORDER BY key_passes DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'prog_passes', player_id, prog_passes::float8 FROM (
        SELECT player_id, prog_passes,
               ROW_NUMBER() OVER (ORDER BY prog_passes DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'dribbles_succ', player_id, dribbles_succ::float8 FROM (
        SELECT player_id, dribbles_succ,
               ROW_NUMBER() OVER (ORDER BY dribbles_succ DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'pressures_won', player_id, pressures_won::float8 FROM (
        SELECT player_id, pressures_won,
               ROW_NUMBER() OVER (ORDER BY pressures_won DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'interceptions', player_id, interceptions::float8 FROM (
        SELECT player_id, interceptions,
               ROW_NUMBER() OVER (ORDER BY interceptions DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'tackles', player_id, tackles::float8 FROM (
        SELECT player_id, tackles,
               ROW_NUMBER() OVER (ORDER BY tackles DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'pass_accuracy', player_id, pass_accuracy FROM (
        SELECT player_id, pass_accuracy, passes_attempted,
               ROW_NUMBER() OVER (ORDER BY pass_accuracy DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
        WHERE passes_attempted >= 200
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'minutes', player_id, minutes::float8 FROM (
        SELECT player_id, minutes,
               ROW_NUMBER() OVER (ORDER BY minutes DESC NULLS LAST, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'appearances', player_id, appearances::float8 FROM (
        SELECT player_id, appearances,
               ROW_NUMBER() OVER (ORDER BY appearances DESC NULLS LAST, minutes DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'motm', player_id, motm::float8 FROM (
        SELECT player_id, motm,
               ROW_NUMBER() OVER (ORDER BY motm DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'cards_yellow', player_id, cards_yellow::float8 FROM (
        SELECT player_id, cards_yellow,
               ROW_NUMBER() OVER (ORDER BY cards_yellow DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
      UNION ALL
      SELECT 'cards_red', player_id, cards_red::float8 FROM (
        SELECT player_id, cards_red,
               ROW_NUMBER() OVER (ORDER BY cards_red DESC NULLS LAST, minutes DESC, appearances DESC, player_id ASC) rn
        FROM agg
      ) s WHERE rn = 1
    ),
    enriched AS (
      SELECT
        r.metric, r.value,
        p.player_id, p.cust_id, p.name, p.slug, p.short_name,
        p.position, p.height, p.country_code, p.country_name,
        p.birthdate, p.current_team_cust_id, p.shirt_number, p.updated_at
      FROM ranked r
      JOIN players p ON p.player_id = r.player_id
    )
    SELECT * FROM enriched;
  `;

  const { rows } = await pool.query(sql, [teamId]);

  // ✅ Always include all metrics
  const out: any = { teamId };
  for (const key of METRICS) out[key] = { value: null, player: null };

  for (const r of rows) {
    out[r.metric] = {
      value: r.value !== null ? Number(r.value) : null,
      player: {
        player_id: String(r.player_id),
        cust_id: String(r.cust_id),
        name: r.name,
        slug: r.slug,
        short_name: r.short_name,
        position: r.position,
        height: r.height !== null ? Number(r.height) : null,
        country_code: r.country_code,
        country_name: r.country_name,
        birthdate: r.birthdate,
        current_team_cust_id: r.current_team_cust_id
          ? String(r.current_team_cust_id)
          : null,
        shirt_number: r.shirt_number !== null ? Number(r.shirt_number) : null,
        updated_at: r.updated_at,
      },
    };
  }

  res.json(out);
}
