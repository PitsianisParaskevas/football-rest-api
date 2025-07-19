import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

const dbName = process.env.OVERRIDE_DATABASE || process.env.PG_DATABASE;

export const pool = new Pool({
  host: process.env.PG_HOST,
  port: Number(process.env.PG_PORT),
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: dbName,
});
