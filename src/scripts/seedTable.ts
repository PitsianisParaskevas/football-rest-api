import dotenv from "dotenv";
dotenv.config();

const dbName = process.argv[2];
const targetTable = process.argv[3];

if (!dbName || !targetTable) {
  console.error("❌ Usage: npm run seed-table -- <database> <table>");
  process.exit(1);
}

process.env.OVERRIDE_DATABASE = dbName;

import { pool } from "../db/client.js";
import { seedTournaments } from "../seeders/seedTournaments.js";
import { seedTeams } from "../seeders/seedTeams.js";
import { seedTournamentTeams } from "../seeders/seedTournamentTeams.js";
import { seedMatches } from "../seeders/seedMatches.js";

const seedTable = async () => {
  try {
    console.log(`🌱 Seeding table '${targetTable}' in DB: ${dbName}`);
    const name = targetTable.toLowerCase();

    switch (name) {
      case "tournaments":
        await seedTournaments();
        break;
      case "teams":
        await seedTeams();
        break;
      case "tournament_team":
      case "tournament_teams":
        await seedTournamentTeams();
        break;
      case "matches":
        await seedMatches();
        break;
      default:
        console.warn(`⚠️ Unknown table: '${targetTable}'`);
    }

    console.log("✅ Seeding for '${targetTable}' complete.");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await pool.end();
  }
};

seedTable();
