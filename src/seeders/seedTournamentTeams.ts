import { pool } from "../db/client.js";
import fs from "fs/promises";
import path from "path";

export const seedTournamentTeams = async () => {
    const filePath = path.resolve("src/db/data/tournament_teams.json");
    const data = JSON.parse(await fs.readFile(filePath, "utf-8"));

    for (const entry of data) {
        const { tournament_id, team_id } = entry;

        await pool.query(
            `
      INSERT INTO tournament_team (
        tournament_cust_id, team_cust_id
      ) VALUES ($1, $2)
      `,
            [tournament_id, team_id]
        );

        console.log(`✅ Linked team ${team_id} to tournament ${tournament_id}`);
    }
};
