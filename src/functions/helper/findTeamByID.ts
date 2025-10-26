import { pool } from "@/db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

export async function findTeamById(custId: number | string) {
  if (
    (typeof custId !== "string" && typeof custId !== "number") ||
    (typeof custId === "string" && custId.trim() === "")
  ) {
    throw new BadRequestError("custId must be a non-empty string or number");
  }

  const teamSql = `
    SELECT
      t.id              AS id,
      t.cust_id         AS cust_id,
      t.name            AS name,
      t.slug            AS slug,
      t.short_name      AS short_name,
      t.name_code       AS name_code,
      t.country_name    AS country_name,
      t.country_slug    AS country_slug
    FROM teams t
    WHERE t.cust_id = $1
    LIMIT 1
  `;
  const teamRes = await pool.query(teamSql, [custId]);
  if (teamRes.rows.length === 0) {
    throw new NotFoundError(`Team with cust_id ${custId} not found`);
  }
  const team = teamRes.rows[0];

  const tournamentsSql = `
    SELECT
      tr.id           AS id,
      tr.cust_id      AS cust_id,
      tr.name         AS name,
      tr.slug         AS slug,
      tr.country_name AS country_name,
      tr.country_slug AS country_slug
    FROM tournament_team tt
    JOIN tournaments tr
      ON tr.cust_id = tt.tournament_cust_id
    WHERE tt.team_cust_id = $1
    ORDER BY tr.name
  `;
  const tournamentsRes = await pool.query(tournamentsSql, [custId]);

  return {
    ...team,
    tournaments: tournamentsRes.rows,
  };
}

export default findTeamById;
