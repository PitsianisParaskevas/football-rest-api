import { pool } from "../db/client.js";
import fs from "fs/promises";
import path from "path";

export const seedMatches = async () => {
  const filePath = path.resolve("src/db/data/matches.json");
  const data = JSON.parse(await fs.readFile(filePath, "utf-8"));

  for (const match of data) {
    const {
      tournament_id,
      cust_id,
      round,
      match_date,
      home_team_id,
      away_team_id,
    } = match;

    await pool.query(
      `
      INSERT INTO matches (
        tournament_id, cust_id, round, match_date, home_team_id, away_team_id
      ) VALUES ($1, $2, $3, $4, $5, $6)
      `,
      [tournament_id, cust_id, round, match_date, home_team_id, away_team_id]
    );

    console.log(`✅ Match inserted: ${home_team_id} vs ${away_team_id}`);
  }
};
