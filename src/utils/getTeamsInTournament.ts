// src/db/teams.ts
import type { Pool, PoolClient } from "pg";
import type { Team } from "../types/team";

export async function getTeamsInTournament(
  db: Pool | PoolClient,
  id: number
): Promise<Team[]> {
  const sql = `
    SELECT
      t.cust_id,
      t.name,
      t.slug,
      t.short_name,
      t.name_code,
      t.country_name,
      t.country_slug
    FROM tournament_team tt
    JOIN teams t ON t.cust_id = tt.team_cust_id
    WHERE tt.tournament_cust_id = $1
    ORDER BY t.name;
  `;
  const { rows } = await db.query<Team>(sql, [id]);
  return rows;
}
