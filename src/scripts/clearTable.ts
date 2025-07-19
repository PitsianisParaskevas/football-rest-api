import dotenv from "dotenv";
dotenv.config();

const dbName = process.argv[2];
const tableName = process.argv[3];

if (!dbName || !tableName) {
  console.error("❌ Usage: npm run clear-table -- <database> <table>");
  process.exit(1);
}

process.env.OVERRIDE_DATABASE = dbName;

import { pool } from "../db/client.js";

const clearSingleTable = async () => {
  try {
    console.log(`Clearing table "${tableName}" in database: ${dbName}`);

    await pool.query(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);

    console.log(`Table "${tableName}" cleared.`);
  } catch (err) {
    console.error(`❌ Failed to clear table "${tableName}":`, err);
  } finally {
    await pool.end();
  }
};

clearSingleTable();
