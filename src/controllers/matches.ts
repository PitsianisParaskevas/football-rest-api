import type { Request, Response } from "express";
import { pool } from "../db/clinet";

export const getAllMatches = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const { rows } = await pool.query("SELECT * FROM matches ORDER BY match_id");
  res.json(rows);
};
