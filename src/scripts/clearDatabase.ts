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
    "players",
    "player_team_history",
    "player_market_value",
    "metadata_statistics",
    "match_result",
    "match_result_scenarios",
    "match_stats",
    "match_incidents",
    "match_player_info",
    "match_player_stats",
    "match_player_shot",
    "match_player_heatmap",
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
