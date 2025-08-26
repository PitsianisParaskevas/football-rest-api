import type { RequestHandler } from "express";
import { pool } from "../db/client";
import { BadRequestError } from "@/errors/BadRequestError";
import { NotFoundError } from "@/errors/NotFoundError";

type MetaRow = {
  key: string;
  name: string;
  group: string;
  description?: string | null;
};

async function findExistingMetadataKeys(keys: string[]) {
  if (keys.length === 0) return new Map<string, any>();
  const { rows } = await pool.query(
    `SELECT id, key, name, "group", description
     FROM metadata_statistics
     WHERE key = ANY($1::text[])`,
    [keys]
  );
  return new Map(rows.map((r) => [r.key as string, r]));
}

// GET /metadata-statistics
export const getAllMetadataStatistics: RequestHandler = async (
  _req,
  res,
  next
) => {
  try {
    const { rows } = await pool.query(
      `SELECT id, key, name, "group", description
       FROM metadata_statistics
       ORDER BY id ASC`
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /metadata-statistics/:id
export const getMetadataStatisticById: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { rows } = await pool.query(
      `SELECT id, key, name, "group", description
       FROM metadata_statistics
       WHERE id = $1`,
      [id]
    );
    if (rows.length === 0)
      throw new NotFoundError("Metadata statistic not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /metadata-statistics/by-key/:key
export const getMetadataStatisticByKey: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { key } = req.params;
    const { rows } = await pool.query(
      `SELECT id, key, name, "group", description
       FROM metadata_statistics
       WHERE key = $1`,
      [key]
    );
    if (rows.length === 0)
      throw new NotFoundError("Metadata statistic not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// GET /metadata-statistics/group/:group
export const getMetadataStatisticsByGroup: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { group } = req.params;
    const { rows } = await pool.query(
      `SELECT id, key, name, "group", description
       FROM metadata_statistics
       WHERE "group" = $1
       ORDER BY id ASC`,
      [group]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// POST /metadata-statistics  (single or bulk)
// ON CONFLICT (key) DO NOTHING → returns inserted + skipped + invalid
export const createMetadataStatistics: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const payload: MetaRow[] = Array.isArray(req.body) ? req.body : [req.body];
    if (!payload.length)
      throw new BadRequestError("Body must be an object or a non-empty array");

    const invalid: Array<{ index: number; reason: string }> = [];
    const normalized: MetaRow[] = [];

    // validate + normalize
    payload.forEach((item: any, idx) => {
      const { key, name, group, description } = item ?? {};
      if (!key || !name || !group) {
        invalid.push({
          index: idx,
          reason: "Missing required fields (key, name, group)",
        });
      } else {
        normalized.push({
          key: String(key),
          name: String(name),
          group: String(group),
          description: description ?? null,
        });
      }
    });

    // dedupe keys inside payload
    const seen = new Set<string>();
    const duplicatesInPayload: Array<{ index: number; key: string }> = [];
    const uniqueRows: MetaRow[] = [];
    normalized.forEach((r, idx) => {
      if (seen.has(r.key)) {
        duplicatesInPayload.push({ index: idx, key: r.key });
      } else {
        seen.add(r.key);
        uniqueRows.push(r);
      }
    });
    duplicatesInPayload.forEach((d) =>
      invalid.push({
        index: d.index,
        reason: `Duplicate key in payload: ${d.key}`,
      })
    );

    if (uniqueRows.length === 0)
      throw new BadRequestError("Missing required fields");

    // precheck DB for existing keys
    const existingMap = await findExistingMetadataKeys(
      uniqueRows.map((r) => r.key)
    );
    const toInsert = uniqueRows.filter((r) => !existingMap.has(r.key));
    const existing = Array.from(existingMap.values());

    // insert only new keys
    let inserted: any[] = [];
    if (toInsert.length > 0) {
      const cols = [`key`, `name`, `"group"`, `description`];
      const values: any[] = [];
      const tuples: string[] = [];

      toInsert.forEach((r, i) => {
        const base = i * cols.length;
        tuples.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
        values.push(r.key, r.name, r.group, r.description);
      });

      const sql = `
        INSERT INTO metadata_statistics (key, name, "group", description)
        VALUES ${tuples.join(",")}
        RETURNING id, key, name, "group", description;
      `;
      const result = await pool.query(sql, values);
      inserted = result.rows;
    }

    res.status(201).json({
      inserted_count: inserted.length,
      existing_count: existing.length,
      invalid,
      inserted,
      existing, // rows already in DB with those keys
    });
  } catch (err) {
    next(err);
  }
};

// PUT /metadata-statistics/:id  (partial update allowed)
export const updateMetadataStatisticById: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { key, name, group, description } = req.body;

    const { rows } = await pool.query(
      `
      UPDATE metadata_statistics
      SET key         = COALESCE($2, key),
          name        = COALESCE($3, name),
          "group"     = COALESCE($4, "group"),
          description = COALESCE($5, description)
      WHERE id = $1
      RETURNING id, key, name, "group", description;
      `,
      [id, key ?? null, name ?? null, group ?? null, description ?? null]
    );

    if (rows.length === 0)
      throw new NotFoundError("Metadata statistic not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// PUT /metadata-statistics/by-key  (identify by unique key)
export const updateMetadataStatisticByKey: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { key, name, group, description } = req.body;
    if (!key) throw new BadRequestError("Missing required field: key");

    const { rows } = await pool.query(
      `
      UPDATE metadata_statistics
      SET name        = COALESCE($2, name),
          "group"     = COALESCE($3, "group"),
          description = COALESCE($4, description)
      WHERE key = $1
      RETURNING id, key, name, "group", description;
      `,
      [key, name ?? null, group ?? null, description ?? null]
    );

    if (rows.length === 0)
      throw new NotFoundError("Metadata statistic not found");
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
};

// DELETE /metadata-statistics/:id
export const deleteMetadataStatisticById: RequestHandler = async (
  req,
  res,
  next
) => {
  try {
    const { id } = req.params;
    const { rowCount } = await pool.query(
      `DELETE FROM metadata_statistics WHERE id = $1`,
      [id]
    );
    if (rowCount === 0) throw new NotFoundError("Metadata statistic not found");
    res.status(204).send();
  } catch (err) {
    next(err);
  }
};
