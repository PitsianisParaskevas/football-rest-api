import { pool } from "../db/client.js";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

export const seedScenarios = async () => {
  const filePath = process.env.SEED_SCENARIOS;

  if (!filePath) {
    console.error("❌ SEED_SCENARIOS path not defined in .env");
    return;
  }

  const resolvedPath = path.resolve(filePath);
  const data = JSON.parse(await fs.readFile(resolvedPath, "utf-8"));

  for (const s of data) {
    const { name, team, category, script } = s;

    await pool.query(
      `
      INSERT INTO scenarios (
        name, team, category, script
      ) VALUES ($1, $2, $3, $4)
      `,
      [name, team, category, script]
    );

    console.log(`✅ Scenario inserted: ${name}`);
  }
};
