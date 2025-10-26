import { pool } from "@/db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

type TeamRow = {
  id: string | number;
  cust_id: string | number;
  name: string;
  slug: string;
  short_name: string | null;
  name_code: string | null;
  country_name: string | null;
  country_slug: string | null;
};

type TournamentRow = {
  id: string | number;
  cust_id: string | number;
  name: string;
  slug: string;
  country_name: string | null;
  country_slug: string | null;
  rounds?: number | null;
  total_teams?: number | null;
};

export async function findMatchById(matchCustId: number | string) {
  if (
    (typeof matchCustId !== "string" && typeof matchCustId !== "number") ||
    (typeof matchCustId === "string" && matchCustId.trim() === "")
  ) {
    throw new BadRequestError(
      "matchCustId must be a non-empty string or number"
    );
  }

  // 1) Φέρε το match από matches.cust_id (χωρίς JOINs)
  const matchSql = `
    SELECT
      m.match_id,           -- προαιρετικό, δεν το χρησιμοποιούμε παρακάτω
      m.cust_id,
      m.round,
      m.tournament_id,
      m.home_team_id,
      m.away_team_id
    FROM matches m
    WHERE m.cust_id::text = $1::text
    LIMIT 1
  `;
  const matchRes = await pool.query(matchSql, [String(matchCustId)]);
  if (matchRes.rows.length === 0) {
    throw new NotFoundError(`Match with cust_id ${matchCustId} not found`);
  }
  const m = matchRes.rows[0] as {
    match_id: string | number;
    cust_id: string | number;
    round: number;
    tournament_id: string | number;
    home_team_id: string | number;
    away_team_id: string | number;
  };

  // Helpers: resolve by id OR cust_id (double-lookup)
  const getTeam = async (anyId: string | number): Promise<TeamRow | null> => {
    const sql = `
      SELECT id, cust_id, name, slug, short_name, name_code, country_name, country_slug
      FROM teams
      WHERE id::text = $1::text OR cust_id::text = $1::text
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [String(anyId)]);
    return rows[0] ?? null;
  };

  const getTournament = async (
    anyId: string | number
  ): Promise<TournamentRow | null> => {
    const sql = `
      SELECT
        id, cust_id, name, slug, country_name, country_slug,
        COALESCE(rounds, NULL) AS rounds,
        COALESCE(total_teams, NULL) AS total_teams
      FROM tournaments
      WHERE id::text = $1::text OR cust_id::text = $1::text
      LIMIT 1
    `;
    const { rows } = await pool.query(sql, [String(anyId)]);
    return rows[0] ?? null;
  };

  // 2) Resolve entities
  const [home, away, tournament] = await Promise.all([
    getTeam(m.home_team_id),
    getTeam(m.away_team_id),
    getTournament(m.tournament_id),
  ]);

  if (!home)
    throw new NotFoundError(
      `Home team not found for match cust_id ${matchCustId}`
    );
  if (!away)
    throw new NotFoundError(
      `Away team not found for match cust_id ${matchCustId}`
    );
  if (!tournament)
    throw new NotFoundError(
      `Tournament not found for match cust_id ${matchCustId}`
    );

  // 3) Build requested shape
  return {
    match_cust_id: Number(m.cust_id) || m.cust_id,
    round: m.round,
    home_team: {
      id: String(home.id),
      cust_id: String(home.cust_id),
      name: home.name,
      slug: home.slug,
      shortName: home.short_name,
      nameCode: home.name_code,
      countryName: home.country_name,
      countrySlug: home.country_slug,
    },
    away_team: {
      id: String(away.id),
      cust_id: String(away.cust_id),
      name: away.name,
      slug: away.slug,
      short_name: away.short_name,
      name_code: away.name_code,
      country_name: away.country_name,
      country_slug: away.country_slug,
    },
    tournament: {
      id: String(tournament.id),
      cust_id: String(tournament.cust_id),
      name: tournament.name,
      slug: tournament.slug,
      country_name: tournament.country_name,
      country_slug: tournament.country_slug,
      rounds: tournament.rounds ?? undefined,
      total_teams: tournament.total_teams ?? undefined,
    },
  };
}

export default findMatchById;
