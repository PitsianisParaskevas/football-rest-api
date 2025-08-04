import dotenv from "dotenv";
dotenv.config();

const dbName = process.argv[2];

if (!dbName) {
  console.error("❌ Usage: npm run clear-db -- <database>");
  process.exit(1);
}

process.env.OVERRIDE_DATABASE = dbName;

import { pool } from "../db/client.js";

const clearAllTables = async () => {
  const tables = [
    "matches",
    "tournament_team",
    "teams",
    "tournaments",
    "scenarios",
  ]; // your actual tables, in correct FK order

  console.log(`🧹 Starting to clear tables in database: ${dbName}`);

  for (const table of tables) {
    try {
      await pool.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      console.log(`Cleared table: ${table}`);
    } catch (err: any) {
      console.warn(`⚠️ Skipping table '${table}': ${err.message}`);
    }
  }

  await pool.end();
  console.log("Done clearing database.");
};

clearAllTables();
