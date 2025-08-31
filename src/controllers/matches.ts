import type { Request, Response } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

/** Helper: build IN (...) with param placeholders */
function addIn(
  where: string[],
  params: any[],
  column: string,
  values: number[]
) {
  if (!values.length) return;
  const start = params.length;
  params.push(...values);
  const ph = values.map((_, i) => `$${start + i + 1}`).join(",");
  where.push(`${column} IN (${ph})`);
}

export const getAllMatches = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const { rows } = await pool.query("SELECT * FROM matches ORDER BY match_id");
  res.json(rows);
};

export const createMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  const body = Array.isArray(req.body) ? req.body : [req.body];
  const inserted: any[] = [];

  for (const match of body) {
    const {
      tournament_id,
      cust_id,
      round,
      match_date,
      home_team_id,
      away_team_id,
    } = match;

    const isValid =
      Number.isInteger(tournament_id) &&
      Number.isInteger(cust_id) &&
      Number.isInteger(round) &&
      typeof match_date === "string" &&
      Number.isInteger(home_team_id) &&
      Number.isInteger(away_team_id);

    if (!isValid) {
      throw new BadRequestError("Invalid match fields");
    }

    const { rows } = await pool.query(
      `
      INSERT INTO matches
        (tournament_id, cust_id, round, match_date, home_team_id, away_team_id)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `,
      [tournament_id, cust_id, round, match_date, home_team_id, away_team_id]
    );

    inserted.push(rows[0]);
  }

  res
    .status(201)
    .json(inserted.length > 1 ? { matches: inserted } : { match: inserted[0] });
};

export const updateMatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { match_id } = req.params;
  const {
    tournament_id,
    cust_id,
    round,
    match_date,
    home_team_id,
    away_team_id,
  } = req.body;

  const parsedMatchId = Number(match_id);

  const isValid =
    !isNaN(parsedMatchId) &&
    Number.isInteger(tournament_id) &&
    Number.isInteger(cust_id) &&
    Number.isInteger(round) &&
    home_team_id &&
    away_team_id;

  if (!isValid) {
    throw new BadRequestError("Invalid match fields");
  }

  const { rows } = await pool.query(
    `
    UPDATE matches
    SET
      tournament_id = $1,
      cust_id = $2,
      round = $3,
      match_date = $4,
      home_team_id = $5,
      away_team_id = $6
    WHERE match_id = $7
    RETURNING *
    `,
    [
      tournament_id,
      cust_id,
      round,
      match_date,
      home_team_id,
      away_team_id,
      parsedMatchId,
    ]
  );

  if (rows.length === 0) {
    throw new NotFoundError("Match not found");
  }

  res.status(200).json({ match: rows[0] });
};

export const deleteMatch = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { match_id } = req.params;
  const parsedMatchId = Number(match_id);

  if (isNaN(parsedMatchId)) {
    throw new BadRequestError("Invalid match_id");
  }

  const { rowCount } = await pool.query(
    `DELETE FROM matches WHERE match_id = $1`,
    [parsedMatchId]
  );

  if (rowCount === 0) {
    throw new NotFoundError("Match not found");
  }

  res.sendStatus(204);
};

/** GET /matches?tournament_id=17,8&round=1,2&limit=&offset=  */
export const getMatches = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { tournament_id, round, limit, offset } = req.query;

  const where: string[] = [];
  const params: any[] = [];

  // allow comma-separated lists
  const tids =
    tournament_id !== undefined
      ? String(tournament_id)
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : [];
  const rounds =
    round !== undefined
      ? String(round)
          .split(",")
          .map((s) => Number(s.trim()))
          .filter((n) => Number.isFinite(n))
      : [];

  if (tids.length === 1) {
    params.push(tids[0]);
    where.push(`tournament_id = $${params.length}`);
  } else if (tids.length > 1) {
    addIn(where, params, "tournament_id", tids);
  }

  if (rounds.length === 1) {
    params.push(rounds[0]);
    where.push(`round = $${params.length}`);
  } else if (rounds.length > 1) {
    addIn(where, params, "round", rounds);
  }

  let sql = `
    SELECT
      match_id,
      tournament_id,
      cust_id,
      round,
      match_date,
      home_team_id,
      away_team_id
    FROM matches
  `;
  if (where.length) sql += ` WHERE ${where.join(" AND ")}`;
  sql += ` ORDER BY match_date ASC, cust_id ASC`;

  if (limit !== undefined) {
    params.push(Number(limit));
    sql += ` LIMIT $${params.length}`;
  }
  if (offset !== undefined) {
    params.push(Number(offset));
    sql += ` OFFSET $${params.length}`;
  }

  const { rows } = await pool.query(sql, params);
  res.json(rows);
};

/**
 * POST /matches/search
 * Body (choose ONE style):
 *  A) { tournament_id: number|number[], round: number|number[], limit?, offset? }
 *  B) { pairs: [{ tournament_id:number, round:number }, ...], limit?, offset? }
 */
export const searchMatches = async (req: Request, res: Response): Promise<void> => {
  // Tolerate text/plain JSON (e.g., if client mis-sends content-type)
  let body: any = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      res.status(400).json({ error: "Invalid JSON body" });
      return;
    }
  }
  body = body ?? {};

  const { tournament_id, round, pairs } = body;
  const limitRaw = body?.limit;
  const offsetRaw = body?.offset;

  // Build query
  const params: any[] = [];
  let idx = 0;
  let sql = `
    SELECT
      match_id,
      tournament_id,
      cust_id,
      round,
      match_date,
      home_team_id,
      away_team_id
    FROM matches
    WHERE 1=1
  `;

  if (Array.isArray(pairs) && pairs.length > 0) {
    // Pairwise filtering: WHERE (tournament_id, round) IN ((t1,r1),(t2,r2),...)
    const cleaned = pairs
      .map((p: any) => ({
        t: Number(p?.tournament_id),
        r: Number(p?.round),
      }))
      .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.r));

    if (cleaned.length === 0) {
      res.json({ rows: [], meta: { count: 0, limit: null, offset: null } });
      return;
    }

    const tuplePlaceholders = cleaned
      .map(() => `($${++idx}, $${++idx})`)
      .join(", ");
    params.push(...cleaned.flatMap((p) => [p.t, p.r]));

    sql += ` AND (tournament_id, round) IN (${tuplePlaceholders})`;
  } else {
    // Independent filters via ANY($::int[])
    const tids: number[] = (Array.isArray(tournament_id) ? tournament_id : [tournament_id])
      .filter((v) => v !== undefined)
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));

    const rounds: number[] = (Array.isArray(round) ? round : [round])
      .filter((v) => v !== undefined)
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n));

    // Guard: require at least one filter to avoid accidentally returning all rows
    if (tids.length === 0 && rounds.length === 0) {
      res.status(400).json({ error: "Provide tournament_id/round or pairs" });
      return;
    }

    if (tids.length) {
      sql += ` AND tournament_id = ANY($${++idx}::int[])`;
      params.push(tids);
    }
    if (rounds.length) {
      sql += ` AND round = ANY($${++idx}::int[])`;
      params.push(rounds);
    }
  }

  sql += ` ORDER BY match_date ASC, cust_id ASC`;

  const limit = Number(limitRaw);
  const offset = Number(offsetRaw);
  if (Number.isFinite(limit) && limit > 0) {
    sql += ` LIMIT $${++idx}`;
    params.push(limit);
  }
  if (Number.isFinite(offset) && offset >= 0) {
    sql += ` OFFSET $${++idx}`;
    params.push(offset);
  }

  const { rows } = await pool.query(sql, params);
  res.json({
    rows,
    meta: {
      count: rows.length,
      limit: Number.isFinite(limit) && limit > 0 ? limit : null,
      offset: Number.isFinite(offset) && offset >= 0 ? offset : null,
    },
  });
};