import { pool } from "@/db/client";

/**
 * 🔹 Type: PlayerProfile
 * Περιγράφει τα βασικά στοιχεία ενός παίκτη από τον πίνακα players
 */
export interface PlayerProfile {
  player_id: number;
  cust_id: number;
  name: string;
  slug: string;
  short_name: string;
  position: string | null;
  height: number | null;
  country_code: string | null;
  country_name: string | null;
  birthdate: string | null;
  current_team_cust_id: number | null;
  shirt_number: number | null;
  updated_at: string | null;
}

/**
 * 🔹 getPlayersByCurrentTeam(teamId)
 * Επιστρέφει όλους τους παίκτες που ανήκουν αυτή τη στιγμή στην ομάδα
 * δηλαδή όσους έχουν current_team_cust_id = teamId
 */
export async function getPlayersByCurrentTeam(
  teamId: number
): Promise<PlayerProfile[]> {
  if (!Number.isFinite(teamId)) {
    throw new Error("Invalid teamId parameter");
  }

  const sql = `
    SELECT 
      player_id,
      cust_id,
      name,
      slug,
      short_name,
      position,
      height,
      country_code,
      country_name,
      birthdate,
      current_team_cust_id,
      shirt_number,
      updated_at
    FROM players
    WHERE current_team_cust_id = $1
    ORDER BY name;
  `;

  const { rows } = await pool.query(sql, [teamId]);
  return rows as PlayerProfile[];
}
