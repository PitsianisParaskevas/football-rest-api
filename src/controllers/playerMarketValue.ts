import type { RequestHandler } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

type PMVRow = {
  player_cust_id: number;
  market_value: number; // integer (bigint in DB)
  market_currency: string; // 'EUR', 'USD', ...
  value_date: string; // 'YYYY-MM-DD'
  source: string;
};

// GET /player-market-values
export const getAllPlayerMarketValues: RequestHandler = async (
  _req,
  res,
  next
) => {
  try {
    const { rows } = await pool.query(
      "SELECT * FROM player_market_value ORDER BY id"
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /player-market-values/:id
export const getPlayerMarketValueById: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      "SELECT * FROM player_market_value WHERE id = $1",
      [id]
    );
    if (rows.length === 0)
      throw new NotFoundError("Market value record not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /player-market-values/player/:cust_id?from=YYYY-MM-DD&to=YYYY-MM-DD
export const getPlayerMarketValuesByPlayer: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { cust_id } = req.params;
    const { from, to } = req.query as { from?: string; to?: string };

    const params: any[] = [cust_id];
    const where: string[] = ["player_cust_id = $1"];

    if (from) {
      params.push(from);
      where.push(`value_date >= $${params.length}`);
    }
    if (to) {
      params.push(to);
      where.push(`value_date <= $${params.length}`);
    }

    const sql = `
      SELECT * FROM player_market_value
      WHERE ${where.join(" AND ")}
      ORDER BY value_date ASC, source ASC;
    `;
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /player-market-values  (single or bulk array)
// ON CONFLICT (player_cust_id, value_date, source) DO NOTHING
export const createPlayerMarketValues: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const payload: PMVRow[] = Array.isArray(req.body) ? req.body : [req.body];
    if (!payload.length)
      throw new BadRequestError("Body must be an object or a non-empty array");

    const invalid: Array<{ index: number; reason: string }> = [];
    const rows: PMVRow[] = [];

    payload.forEach((item: any, idx) => {
      const {
        player_cust_id,
        market_value,
        market_currency,
        value_date,
        source,
      } = item ?? {};
      if (
        !player_cust_id ||
        market_value == null ||
        !market_currency ||
        !value_date ||
        !source
      ) {
        invalid.push({
          index: idx,
          reason:
            "Missing required fields (player_cust_id, market_value, market_currency, value_date, source)",
        });
        return;
      }
      rows.push({
        player_cust_id: Number(player_cust_id),
        market_value: Number(market_value),
        market_currency: String(market_currency),
        value_date: String(value_date),
        source: String(source),
      });
    });

    if (!rows.length) throw new BadRequestError("Missing required fields");

    const cols = [
      "player_cust_id",
      "market_value",
      "market_currency",
      "value_date",
      "source",
    ];
    const values: any[] = [];
    const tuples: string[] = [];

    rows.forEach((r, i) => {
      const base = i * cols.length;
      tuples.push(
        `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`
      );
      values.push(
        r.player_cust_id,
        r.market_value,
        r.market_currency,
        r.value_date,
        r.source
      );
    });

    const sql = `
      INSERT INTO player_market_value (${cols.join(",")})
      VALUES ${tuples.join(",")}
      ON CONFLICT (player_cust_id, value_date, source) DO NOTHING
      RETURNING *;
    `;

    const { rows: inserted } = await pool.query(sql, values);
    const skipped_count = payload.length - invalid.length - inserted.length;

    res.status(201).json({
      inserted_count: inserted.length,
      skipped_count: skipped_count < 0 ? 0 : skipped_count,
      invalid,
      inserted,
    });
  } catch (err) {
    next(err);
  }
};

// PUT /player-market-values/:id
export const updatePlayerMarketValue: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const {
      player_cust_id,
      market_value,
      market_currency,
      value_date,
      source,
    } = req.body;

    const { rows } = await pool.query(
      `
      UPDATE player_market_value
      SET player_cust_id  = $1,
          market_value    = $2,
          market_currency = $3,
          value_date      = $4,
          source          = $5
      WHERE id = $6
      RETURNING *;
      `,
      [player_cust_id, market_value, market_currency, value_date, source, id]
    );

    if (rows.length === 0)
      throw new NotFoundError("Market value record not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /player-market-values/by-key   (identify row by the UNIQUE key)
export const updatePlayerMarketValueByKey: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const {
      player_cust_id,
      value_date,
      source,
      market_value,
      market_currency,
    } = req.body;

    if (!player_cust_id || !value_date || !source) {
      throw new BadRequestError(
        "Missing required key fields (player_cust_id, value_date, source)"
      );
    }

    const { rows } = await pool.query(
      `
      UPDATE player_market_value
      SET market_value    = COALESCE($4, market_value),
          market_currency = COALESCE($5, market_currency)
      WHERE player_cust_id = $1
        AND value_date     = $2
        AND source         = $3
      RETURNING *;
      `,
      [
        player_cust_id,
        value_date,
        source,
        market_value ?? null,
        market_currency ?? null,
      ]
    );

    if (rows.length === 0)
      throw new NotFoundError("Market value record not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /player-market-values/:id
export const deletePlayerMarketValue: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      "DELETE FROM player_market_value WHERE id = $1",
      [id]
    );
    if (rowCount === 0)
      throw new NotFoundError("Market value record not found");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
