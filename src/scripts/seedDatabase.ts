import dotenv from "dotenv";
dotenv.config();

const dbName = process.argv[2];
if (!dbName) {
  console.error("❌ Usage: npm run seed-db -- <database>");
  process.exit(1);
}
process.env.OVERRIDE_DATABASE = dbName;

import { pool } from "../db/client.js";
import { seedTournaments } from "../seeders/seedTournaments.js";
import { seedTeams } from "../seeders/seedTeams.js";
import { seedTournamentTeams } from "../seeders/seedTournamentTeams.js";
import { seedMatches } from "../seeders/seedMatches.js";
import { seedScenarios } from "@/seeders/seedScenarios.js";

const seedAll = async () => {
  try {
    console.log(`🌱 Seeding ALL tables in DB: ${dbName}`);
    await seedTournaments();
    await seedTeams();
    await seedTournamentTeams();
    await seedMatches();
    await seedScenarios();
    console.log("✅ All seeding complete.");
  } catch (err) {
    console.error("❌ Seeding failed:", err);
  } finally {
    await pool.end();
  }
};

seedAll();
