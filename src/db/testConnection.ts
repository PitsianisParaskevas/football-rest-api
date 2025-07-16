// src/db/testConnection.ts
import { pool } from "./clinet";

async function testConnection() {
  try {
    const res = await pool.query("SELECT NOW()");
    console.log("🟢 Connected to DB at:", res.rows[0].now);
  } catch (err) {
    console.error("🔴 Connection failed:", err);
  } finally {
    await pool.end();
  }
}

testConnection();
