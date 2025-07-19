import { pool } from "../db/client.js";
import fs from "fs/promises";
import path from "path";

export const seedTeams = async () => {
  const filePath = path.resolve("src/db/data/teams.json");
  const data = JSON.parse(await fs.readFile(filePath, "utf-8"));

  for (const team of data) {
    const {
      cust_id,
      name,
      slug = null,
      short_name = null,
      name_code = null,
      country_name = null,
      country_slug = null,
    } = team;

    await pool.query(
      `
      INSERT INTO teams (
        cust_id, name, slug, short_name, name_code, country_name, country_slug
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [cust_id, name, slug, short_name, name_code, country_name, country_slug]
    );

    console.log(`✅ Team inserted: ${name}`);
  }
};
