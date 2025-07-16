// src/scripts/server.ts
import express from "express";
import dotenv from "dotenv";
import { pool } from "../db/clinet";

// Load environment variables
dotenv.config();

// Determine port
const PORT = Number(process.env.PORT) || 3000;
console.log(`🔄 Starting server on port ${PORT}...`);

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

/**
 ***************************
 ***************************
        tournaments 
 ***************************
 ***************************
 */

// #create-tournament
app.post("/tournaments", async (req: any, res: any) => {
  // Normalize to an array
  const body = req.body.tournament ?? req.body;
  const items = Array.isArray(body) ? body : [body];
  console.log("📥 Received payloads:", items);

  const inserted: any[] = [];
  try {
    for (const payload of items) {
      // Destructure and ignore any provided `id`
      const {
        cust_id,
        name,
        slug,
        countryName,
        countrySlug,
        rounds: r1,
        rountds: r2,
        total_teams,
      } = payload;
      // Use either the correct field or the typo
      const rounds = typeof r1 === "number" ? r1 : r2;

      // Validation
      if (
        typeof cust_id !== "number" ||
        typeof name !== "string" ||
        typeof slug !== "string" ||
        typeof countryName !== "string" ||
        typeof countrySlug !== "string" ||
        typeof rounds !== "number" ||
        typeof total_teams !== "number"
      ) {
        console.warn("⚠️ Invalid tournament fields:", payload);
        return res
          .status(400)
          .json({ message: "Missing or invalid tournament fields", payload });
      }

      const insertQuery = `
        INSERT INTO tournaments
          (cust_id, name, slug, country_name, country_slug, rounds, total_teams)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `;
      const values = [
        cust_id,
        name,
        slug,
        countryName,
        countrySlug,
        rounds,
        total_teams,
      ];
      const { rows } = await pool.query(insertQuery, values);
      console.log("✅ Inserted tournament:", rows[0]);
      inserted.push(rows[0]);
    }

    // Send back single or multiple
    if (inserted.length > 1) {
      return res.status(201).json({ tournaments: inserted });
    } else {
      return res.status(201).json({ tournament: inserted[0] });
    }
  } catch (err: any) {
    console.error("❌ Error inserting tournaments:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// #get-all-tournaments
app.get("/tournaments", async (_req: any, res: any) => {
  try {
    const { rows } = await pool.query("SELECT * FROM tournaments ORDER BY id");
    return res.json(rows);
  } catch (error: any) {
    console.error("❌ Error fetching tournaments:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 * #PUT /tournaments/:id
 * Updates a tournament record by ID.
 * Body schema:
 *   { cust_id, name, slug, countryName, countrySlug, rounds, total_teams }
 */
app.put("/tournaments/:id", async (req: any, res: any) => {
  const { id } = req.params;
  const payload = req.body.tournament ?? req.body;
  console.log("🔄 Received update payload for ID", id, payload);

  const { cust_id, name, slug, countryName, countrySlug, rounds, total_teams } =
    payload;

  // Basic validation
  if (
    typeof cust_id !== "number" ||
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof countryName !== "string" ||
    typeof countrySlug !== "string" ||
    typeof rounds !== "number" ||
    typeof total_teams !== "number"
  ) {
    console.warn("⚠️ Invalid update fields for ID", id, payload);
    return res
      .status(400)
      .json({ message: "Missing or invalid tournament fields" });
  }

  try {
    const updateQuery = `
      UPDATE tournaments SET
        cust_id = $1,
        name = $2,
        slug = $3,
        country_name = $4,
        country_slug = $5,
        rounds = $6,
        total_teams = $7
      WHERE id = $8
      RETURNING *
    `;
    const values = [
      cust_id,
      name,
      slug,
      countryName,
      countrySlug,
      rounds,
      total_teams,
      id,
    ];
    const { rows } = await pool.query(updateQuery, values);
    if (!rows.length) {
      return res.status(404).json({ message: "Tournament not found" });
    }
    console.log("✅ Updated tournament:", rows[0]);
    return res.json({ tournament: rows[0] });
  } catch (error: any) {
    console.error("❌ Error updating tournament:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 * #DELETE /tournaments/:id
 * Deletes a tournament by ID
 */
app.delete("/tournaments/:id", async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query(
      "DELETE FROM tournaments WHERE id = $1",
      [id]
    );
    if (!rowCount)
      return res.status(404).json({ message: "Tournament not found" });
    console.log(`🗑️ Deleted tournament with ID ${id}`);
    return res.sendStatus(204);
  } catch (error: any) {
    console.error("❌ Error deleting tournament:", error);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 ***************************
 ***************************
            Teams 
 ***************************
 ***************************
 */

app.post("/teams", async (req: any, res: any) => {
  // Normalize incoming payload to an array
  const body = req.body.team ?? req.body;
  const teams = Array.isArray(body) ? body : [body];

  console.log("📥 Received teams payload:", teams);

  const inserted: any[] = [];
  try {
    for (const payload of teams) {
      const {
        cust_id,
        name,
        slug,
        shortName,
        nameCode,
        countryName,
        countrySlug,
      } = payload;

      // Validation
      if (
        typeof cust_id !== "number" ||
        typeof name !== "string" ||
        typeof slug !== "string" ||
        typeof shortName !== "string" ||
        typeof nameCode !== "string" ||
        typeof countryName !== "string" ||
        typeof countrySlug !== "string"
      ) {
        return res
          .status(400)
          .json({ message: "Missing or invalid team fields", payload });
      }

      const insertQuery = `
        INSERT INTO teams
          (cust_id, name, slug, short_name, name_code, country_name, country_slug)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
      `;
      const values = [
        cust_id,
        name,
        slug,
        shortName,
        nameCode,
        countryName,
        countrySlug,
      ];
      const { rows } = await pool.query(insertQuery, values);
      console.log("✅ Inserted team:", rows[0]);
      inserted.push(rows[0]);
    }

    // If you POST’d one object, return just that, otherwise an array
    return res
      .status(201)
      .json(inserted.length > 1 ? { teams: inserted } : { team: inserted[0] });
  } catch (err: any) {
    console.error("❌ Error inserting teams:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// GET all teams
app.get("/teams", async (_req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT id,
             cust_id,
             name,
             slug,
             short_name AS "shortName",
             name_code AS "nameCode",
             country_name AS "countryName",
             country_slug AS "countrySlug"
      FROM teams
      ORDER BY id
    `);
    return res.json(rows);
  } catch (err: any) {
    console.error("❌ Error fetching teams:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// GET a single team by slug and cust_id
// e.g. GET /teams/brighton-and-hove-albion/30
app.get("/teams/:slug/:cust_id", async (req: any, res: any) => {
  const { slug, cust_id } = req.params;
  const cid = Number(cust_id);
  if (isNaN(cid)) {
    return res.status(400).json({ message: "Invalid `cust_id` parameter" });
  }
  try {
    const { rows } = await pool.query(
      `
      SELECT id,
             cust_id,
             name,
             slug,
             short_name AS "shortName",
             name_code AS "nameCode",
             country_name AS "countryName",
             country_slug AS "countrySlug"
      FROM teams
      WHERE slug = $1 AND cust_id = $2
    `,
      [slug, cid]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    return res.json(rows[0]);
  } catch (err: any) {
    console.error("❌ Error fetching team:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// PUT (edit) a team by its numeric ID
// e.g. PUT /teams/123
app.put("/teams/:id", async (req: any, res: any) => {
  const { id } = req.params;
  const payload = req.body.team ?? req.body;
  const { cust_id, name, slug, shortName, nameCode, countryName, countrySlug } =
    payload;
  // validate...
  if (
    typeof cust_id !== "number" ||
    typeof name !== "string" ||
    typeof slug !== "string" ||
    typeof shortName !== "string" ||
    typeof nameCode !== "string" ||
    typeof countryName !== "string" ||
    typeof countrySlug !== "string"
  ) {
    return res.status(400).json({ message: "Missing or invalid team fields" });
  }
  try {
    const { rows } = await pool.query(
      `
      UPDATE teams SET
        cust_id     = $1,
        name        = $2,
        slug        = $3,
        short_name  = $4,
        name_code   = $5,
        country_name = $6,
        country_slug = $7
      WHERE id = $8
      RETURNING id,
                cust_id,
                name,
                slug,
                short_name AS "shortName",
                name_code AS "nameCode",
                country_name AS "countryName",
                country_slug AS "countrySlug"
    `,
      [cust_id, name, slug, shortName, nameCode, countryName, countrySlug, id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    return res.json({ team: rows[0] });
  } catch (err: any) {
    console.error("❌ Error updating team:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// DELETE a team by ID
// e.g. DELETE /teams/123
app.delete("/teams/:id", async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const { rowCount } = await pool.query("DELETE FROM teams WHERE id = $1", [
      id,
    ]);
    if (rowCount === 0) {
      return res.status(404).json({ message: "Team not found" });
    }
    console.log(`🗑️ Deleted team with ID ${id}`);
    return res.sendStatus(204);
  } catch (err: any) {
    console.error("❌ Error deleting team:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
  ***************************
  ***************************
      tournaments-teams
  ***************************
  ***************************
 */
/**
 * POST /tournament-teams
 * Body: single object or array of:
 *   { tournament_id: number, team_id: number }
 */
/**
 * POST /tournament-teams
 * Body: a single mapping or array of:
 *   { tournament_id: number, team_id: number }
 */
app.post("/tournament-teams", async (req: any, res: any) => {
  // Normalize payload to an array
  const body = req.body;
  const mappings = Array.isArray(body) ? body : [body];
  console.log("📥 Received mappings (cust_id):", mappings);

  try {
    const inserted: { tournament_cust_id: number; team_cust_id: number }[] = [];

    for (const { tournament_cust_id, team_cust_id } of mappings) {
      // Validate inputs
      if (
        typeof tournament_cust_id !== "number" ||
        typeof team_cust_id !== "number"
      ) {
        return res.status(400).json({
          message: "Expected numeric tournament_cust_id & team_cust_id",
          mapping: { tournament_cust_id, team_cust_id },
        });
      }

      // Insert, ignoring duplicates
      const { rows } = await pool.query(
        `
        INSERT INTO tournament_team (tournament_cust_id, team_cust_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
        RETURNING tournament_cust_id, team_cust_id
        `,
        [tournament_cust_id, team_cust_id]
      );

      // If it already existed, rows will be empty—echo back input
      inserted.push(rows[0] || { tournament_cust_id, team_cust_id });
    }

    // Return single or multiple
    return res
      .status(201)
      .json(
        inserted.length > 1 ? { mappings: inserted } : { mapping: inserted[0] }
      );
  } catch (err: any) {
    console.error("❌ Error inserting mappings:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 * GET /tournament-teams
 * Returns all tournament↔team links.
 */
app.get("/tournament-teams", async (_req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        tournament_cust_id,
        team_cust_id
      FROM tournament_team
      ORDER BY tournament_cust_id, team_cust_id
    `);
    return res.json(rows);
  } catch (err: any) {
    console.error("❌ Error fetching mappings:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 * DELETE /tournament-teams/:tournament_id/:team_id
 * Deletes the specified mapping (204 or 404).
 */
app.delete(
  "/tournament-teams/:tournament_id/:team_cust_id",
  async (req: any, res: any) => {
    const tId = Number(req.params.tournament_id);
    const tmId = Number(req.params.team_id);
    if (isNaN(tId) || isNaN(tmId)) {
      return res.status(400).json({ message: "Invalid path parameters" });
    }
    try {
      const { rowCount } = await pool.query(
        `DELETE FROM tournament_team
       WHERE tournament_id = $1 AND team_id = $2`,
        [tId, tmId]
      );
      if (!rowCount) {
        return res.status(404).json({ message: "Mapping not found" });
      }
      console.log(`🗑️ Deleted mapping ${tId} ↔ ${tmId}`);
      return res.sendStatus(204);
    } catch (err: any) {
      console.error("❌ Error deleting mapping:", err);
      return res.status(500).json({ message: "Server Error" });
    }
  }
);

/**
  ***************************
  ***************************
      matches
  ***************************
  ***************************
 */
/**
 * POST /matches
 * Body: a single object or array of:
 * {
 *   tournament_id:   number,          // external cust_id of the tournament
 *   cust_id:         number,          // external cust_id of the match
 *   round:           number,
 *   match_date:      string (ISO),    // e.g. "2024-08-16T19:00:00.000Z"
 *   home_team_id:    number,          // external cust_id of home team
 *   away_team_id:    number           // external cust_id of away team
 * }
 */
/**
 * POST /matches
 * Body: single object or array of:
 * {
 *   tournament_id: number,       // external cust_id of tournament
 *   cust_id:       number,       // external cust_id of the match
 *   round:         number,
 *   match_date:    string (ISO),
 *   home_team_id:  number,       // external cust_id of home team
 *   away_team_id:  number        // external cust_id of away team
 * }
 */
app.post("/matches", async (req: any, res: any) => {
  const body = req.body;
  const items = Array.isArray(body) ? body : [body];
  console.log("📥 Received matches payload:", items);

  try {
    // Preflight: check all referenced tournaments/teams
    for (const m of items) {
      const { tournament_id, home_team_id, away_team_id } = m;

      // 1) Tournament exists?
      const tRes = await pool.query(
        "SELECT 1 FROM tournaments WHERE cust_id = $1",
        [tournament_id]
      );
      if (!tRes.rowCount) {
        return res.status(404).json({
          message: `Tournament not found (cust_id=${tournament_id})`,
          payload: m,
        });
      }

      // 2) Home team exists?
      const hRes = await pool.query("SELECT 1 FROM teams WHERE cust_id = $1", [
        home_team_id,
      ]);
      if (!hRes.rowCount) {
        return res.status(404).json({
          message: `Home team not found (cust_id=${home_team_id})`,
          payload: m,
        });
      }

      // 3) Away team exists?
      const aRes = await pool.query("SELECT 1 FROM teams WHERE cust_id = $1", [
        away_team_id,
      ]);
      if (!aRes.rowCount) {
        return res.status(404).json({
          message: `Away team not found (cust_id=${away_team_id})`,
          payload: m,
        });
      }
    }

    // Build bulk INSERT
    const values: any[] = [];
    const rowsSql = items.map((m, i) => {
      const {
        tournament_id,
        cust_id,
        round,
        match_date,
        home_team_id,
        away_team_id,
      } = m;

      // Validate types
      if (
        typeof tournament_id !== "number" ||
        typeof cust_id !== "number" ||
        typeof round !== "number" ||
        typeof match_date !== "string" ||
        typeof home_team_id !== "number" ||
        typeof away_team_id !== "number"
      ) {
        throw { status: 400, message: "Invalid match fields", payload: m };
      }

      values.push(
        tournament_id,
        cust_id,
        round,
        match_date,
        home_team_id,
        away_team_id
      );

      const offset = i * 6;
      const placeholders = [1, 2, 3, 4, 5, 6]
        .map((n) => `$${offset + n}`)
        .join(",");
      return `(${placeholders})`;
    });

    const insertSql = `
      INSERT INTO matches
        (tournament_id, cust_id, round, match_date, home_team_id, away_team_id)
      VALUES
        ${rowsSql.join(",\n")}
      RETURNING *
    `;

    const { rows } = await pool.query(insertSql, values);
    return res
      .status(201)
      .json(rows.length > 1 ? { matches: rows } : { match: rows[0] });
  } catch (err: any) {
    console.error("❌ Error inserting matches:", err);
    if (err.status) {
      return res
        .status(err.status)
        .json({ message: err.message, payload: err.payload });
    }
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 * GET /matches
 * Returns all matches.
 */
app.get("/matches", async (_req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT
        match_id,
        tournament_id,
        cust_id        AS match_cust_id,
        round,
        match_date,
        home_team_id,
        away_team_id
      FROM matches
      ORDER BY match_date
    `);
    return res.json(rows);
  } catch (err: any) {
    console.error("❌ Error fetching matches:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

// 1. All matches in a given tournament, grouped by round
// http://localhost:3000/tournaments/17/matches/by-round
app.get(
  "/tournaments/:tournament_cust_id/matches/by-round",
  async (req: any, res: any) => {
    const tId = Number(req.params.tournament_cust_id);
    if (isNaN(tId)) {
      return res.status(400).json({ message: "Invalid tournament_cust_id" });
    }

    try {
      const { rows } = await pool.query(
        `
      SELECT
        round,
        json_agg(
          json_build_object(
            'match_id',      match_id,
            'cust_id',       cust_id,
            'match_date',    match_date,
            'home_team_id',  home_team_id,
            'away_team_id',  away_team_id
          )
        ) AS matches
      FROM matches
      WHERE tournament_id = $1
      GROUP BY round
      ORDER BY round
      `,
        [tId]
      );
      return res.json(rows);
    } catch (err: any) {
      console.error("❌ Error fetching matches by round:", err);
      return res.status(500).json({ message: "Server Error" });
    }
  }
);

// 1. All matches in a given tournament, grouped by round
// http://localhost:3000/tournaments/17/matches/by-round
app.get(
  "/tournaments/:tournament_cust_id/matches/by-round",
  async (req: any, res: any) => {
    const tId = Number(req.params.tournament_cust_id);
    if (isNaN(tId)) {
      return res.status(400).json({ message: "Invalid tournament_cust_id" });
    }

    try {
      const { rows } = await pool.query(
        `
      SELECT
        round,
        json_agg(
          json_build_object(
            'match_id',      match_id,
            'cust_id',       cust_id,
            'match_date',    match_date,
            'home_team_id',  home_team_id,
            'away_team_id',  away_team_id
          )
        ) AS matches
      FROM matches
      WHERE tournament_id = $1
      GROUP BY round
      ORDER BY round
      `,
        [tId]
      );
      return res.json(rows);
    } catch (err: any) {
      console.error("❌ Error fetching matches by round:", err);
      return res.status(500).json({ message: "Server Error" });
    }
  }
);

// 2. All matches in a given team
// http://localhost:3000/teams/43/matches/by-round
app.get("/teams/:team_cust_id/matches/by-round", async (req: any, res: any) => {
  const tId = Number(req.params.team_cust_id);
  if (isNaN(tId)) {
    return res.status(400).json({ message: "Invalid team_cust_id" });
  }

  try {
    const { rows } = await pool.query(
      `
      SELECT
        *
      FROM matches
      WHERE home_team_id = $1
      OR away_team_id = $1
      `,
      [tId]
    );
    return res.json(rows);
  } catch (err: any) {
    console.error("❌ Error fetching matches by round:", err);
    return res.status(500).json({ message: "Server Error" });
  }
});

/**
 * POST /matches/search
 * Body JSON:
 * {
 *   tournaments?: number[],    // tournament_cust_id list
 *   teams?:       number[],    // team_cust_id list
 *   rounds?:      number[]|null,
 *   sides?:       ("home"|"away")[]
 * }
 */
// app.post("/matches/search", async (req: any, res: any) => {
//   const { tournaments, teams, rounds, sides } = req.body as {
//     tournaments?: number[];
//     teams?: number[];
//     rounds?: number[] | null;
//     sides?: ("home" | "away")[];
//   };

//   // Build filters
//   const clauses: string[] = [];
//   const vals: any[] = [];

//   if (tournaments?.length) {
//     clauses.push(`tournament_id = ANY($${vals.length + 1})`);
//     vals.push(tournaments);
//   }
//   if (rounds) {
//     // if you want all rounds when rounds is null, skip this
//     clauses.push(`round = ANY($${vals.length + 1})`);
//     vals.push(rounds);
//   }
//   if (teams?.length) {
//     const teamClauses: string[] = [];
//     if (!sides || sides.includes("home")) {
//       teamClauses.push(`home_team_id = ANY($${vals.length + 1})`);
//     }
//     if (!sides || sides.includes("away")) {
//       teamClauses.push(`away_team_id = ANY($${vals.length + 1})`);
//     }
//     clauses.push(`(${teamClauses.join(" OR ")})`);
//     vals.push(teams);
//   }

//   // Assemble SQL
//   const whereSQL = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
//   const sql = `
//     SELECT *
//       FROM matches
//       ${whereSQL}
//     ORDER BY match_date
//   `;

//   try {
//     const { rows } = await pool.query(sql, vals);
//     res.json(rows);
//   } catch (err: any) {
//     console.error("Error filtering matches:", err);
//     res.status(500).json({ message: "Server Error" });
//   }
// });

/**
 * Helper
 */

// Health check endpoint
app.get("/health", (_req: any, res: any) => {
  return res.json({ status: "OK" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
