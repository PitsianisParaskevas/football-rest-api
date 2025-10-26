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

export async function findPlayerById(playerCustId: number | string) {
  if (
    (typeof playerCustId !== "string" && typeof playerCustId !== "number") ||
    (typeof playerCustId === "string" && playerCustId.trim() === "")
  ) {
    throw new BadRequestError(
      "playerCustId must be a non-empty string or number"
    );
  }

  // 1) Παίκτης από players.cust_id
  const playerSql = `
    SELECT
      p.player_id             AS id,
      p.cust_id               AS cust_id,
      p.name                  AS name,
      p.slug                  AS slug,
      p.short_name            AS short_name,
      p.position              AS position,
      p.height                AS height,
      p.country_code          AS country_code,
      p.country_name          AS country_name,
      p.birthdate             AS birthdate,
      p.current_team_cust_id  AS current_team_id,
      p.shirt_number          AS shirt_number
    FROM players p
    WHERE p.cust_id::text = $1::text
    LIMIT 1
  `;
  const playerRes = await pool.query(playerSql, [String(playerCustId)]);
  if (playerRes.rows.length === 0) {
    throw new NotFoundError(`Player with cust_id ${playerCustId} not found`);
  }

  const p = playerRes.rows[0] as {
    id: string | number;
    cust_id: string | number;
    name: string;
    slug: string;
    short_name: string | null;
    position: string | null;
    height: number | null;
    country_code: string | null;
    country_name: string | null;
    birthdate: string | null;
    current_team_id: string | number | null;
    shirt_number: number | null;
  };

  // 2) Ομάδα από current_team_id (είναι cust_id, αλλά διατηρούμε double-lookup για σιγουριά)
  let currentTeam: TeamRow | null = null;
  if (p.current_team_id != null) {
    const teamSql = `
      SELECT
        t.id, t.cust_id, t.name, t.slug, t.short_name, t.name_code, t.country_name, t.country_slug
      FROM teams t
      WHERE t.id::text = $1::text OR t.cust_id::text = $1::text
      LIMIT 1
    `;
    const teamRes = await pool.query(teamSql, [String(p.current_team_id)]);
    currentTeam = teamRes.rows[0] ?? null;
  }

  return {
    id: String(p.id),
    cust_id: String(p.cust_id),
    name: p.name,
    slug: p.slug,
    short_name: p.short_name,
    position: p.position,
    height: p.height,
    country_code: p.country_code,
    country_name: p.country_name,
    birthdate: p.birthdate, // string (ISO/date) ή null
    shirt_number: p.shirt_number,
    current_team_id:
      p.current_team_id != null ? String(p.current_team_id) : null,
    current_team: currentTeam
      ? {
          id: String(currentTeam.id),
          cust_id: String(currentTeam.cust_id),
          name: currentTeam.name,
          slug: currentTeam.slug,
          short_name: currentTeam.short_name,
          name_code: currentTeam.name_code,
          country_name: currentTeam.country_name,
          country_slug: currentTeam.country_slug,
        }
      : null,
  };
}

export default findPlayerById;
