import { pool } from "../db/client.js";
import fs from "fs/promises";
import path from "path";

export const seedTournamentTeams = async () => {
  const filePath = path.resolve("src/db/data/tournament_teams.json");
  const data = JSON.parse(await fs.readFile(filePath, "utf-8"));

  for (const entry of data) {
    const { tournament_cust_id, team_cust_id } = entry; // <-- match JSON keys

    if (
      !Number.isInteger(tournament_cust_id) ||
      !Number.isInteger(team_cust_id)
    ) {
      console.warn("⚠️ Skipping invalid row:", entry);
      continue;
    }

    await pool.query(
      `
      INSERT INTO tournament_team (tournament_cust_id, team_cust_id)
      VALUES ($1, $2)
      ON CONFLICT DO NOTHING
      `,
      [tournament_cust_id, team_cust_id]
    );

    console.log(
      `✅ Linked team ${team_cust_id} to tournament ${tournament_cust_id}`
    );
  }
};
