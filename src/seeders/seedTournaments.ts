import { pool } from "../db/client.js";
import fs from "fs/promises";
import path from "path";

export const seedTournaments = async () => {
  const filePath = path.resolve("src/db/data/tournaments.json");
  const data = JSON.parse(await fs.readFile(filePath, "utf-8"));

  for (const t of data) {
    const {
      cust_id,
      name,
      slug = null,
      country_name = null,
      country_slug = null,
      rounds = null,
      total_teams = null,
    } = t;

    await pool.query(
      `
      INSERT INTO tournaments (
        cust_id, name, slug, country_name, country_slug, rounds, total_teams
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [cust_id, name, slug, country_name, country_slug, rounds, total_teams]
    );

    console.log(`✅ Tournament inserted: ${name}`);
  }
};
