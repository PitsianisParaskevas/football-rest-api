import type { Pool, PoolClient } from "pg";
import type { Tournament } from "@/types/tournament";

export async function getTournamentsInTeams(
  db: Pool | PoolClient,
  id: number
): Promise<Tournament[]> {
  const sql = `
    SELECT 
     t.cust_id
     t.name
     t.slug
     t.country_name
     t.country_slug
     t.rounds
     t.total_teams
     FROM tournament_team tt
     JOIN tournaments t ON t.cust_id = tt.tournament_cust_id
     WHERE tt.team_cust_id = $1
  `;
  const { rows } = await db.query<Tournament>(sql, [id]);
  return rows;
}
