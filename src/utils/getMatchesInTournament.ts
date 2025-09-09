// src/db/matches.ts
import type { Pool, PoolClient } from "pg";
import type { MatchWithTeams } from "@/types/match";
import type { Team } from "@/types/team";

type Row = {
  match_id: number;
  tournament_id: number;
  cust_id: number;
  round: number;
  match_date: Date;

  home_cust_id: number;
  home_name: string;
  home_slug: string;
  home_short_name: string | null;
  home_name_code: string | null;
  home_country_name: string;
  home_country_slug: string;

  away_cust_id: number;
  away_name: string;
  away_slug: string;
  away_short_name: string | null;
  away_name_code: string | null;
  away_country_name: string;
  away_country_slug: string;
};

export async function getMatchesInTournament(
  db: Pool | PoolClient,
  id: number
): Promise<MatchWithTeams[]> {
  const sql = `
    SELECT
      m.match_id,
      m.tournament_id,
      m.cust_id,
      m.round,
      m.match_date,

      -- home team
      th.cust_id       AS home_cust_id,
      th.name          AS home_name,
      th.slug          AS home_slug,
      th.short_name    AS home_short_name,
      th.name_code     AS home_name_code,
      th.country_name  AS home_country_name,
      th.country_slug  AS home_country_slug,

      -- away team
      ta.cust_id       AS away_cust_id,
      ta.name          AS away_name,
      ta.slug          AS away_slug,
      ta.short_name    AS away_short_name,
      ta.name_code     AS away_name_code,
      ta.country_name  AS away_country_name,
      ta.country_slug  AS away_country_slug

    FROM matches m
    JOIN teams th ON th.cust_id = m.home_team_id
    JOIN teams ta ON ta.cust_id = m.away_team_id
    WHERE m.tournament_id = $1
    ORDER BY m.match_date ASC, m.match_id ASC;
  `;

  const { rows } = await db.query<Row>(sql, [id]);

  return rows.map((r): MatchWithTeams => {
    const home_team: Team = {
      cust_id: r.home_cust_id,
      name: r.home_name,
      slug: r.home_slug,
      short_name: r.home_short_name ?? undefined,
      name_code: r.home_name_code ?? undefined,
      country_name: r.home_country_name,
      country_slug: r.home_country_slug,
    };

    const away_team: Team = {
      cust_id: r.away_cust_id,
      name: r.away_name,
      slug: r.away_slug,
      short_name: r.away_short_name ?? undefined,
      name_code: r.away_name_code ?? undefined,
      country_name: r.away_country_name,
      country_slug: r.away_country_slug,
    };

    return {
      match_id: r.match_id,
      tournament_id: r.tournament_id,
      cust_id: r.cust_id,
      round: r.round,
      match_date: r.match_date,
      home_team,
      away_team,
    };
  });
}
