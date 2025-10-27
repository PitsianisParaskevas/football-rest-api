import { pool } from "@/db/client";

type TotAvg = {
  total: number;
  avg: number;
  xGTotal: number;
  xGAvg: number;
  xGotTotal: number;
  xGotAvg: number;
};

export type GetPlayerGoalResponse = {
  playerCustId: number;
  matches: number; // DISTINCT match_cust_id με goal records
  goals: TotAvg; // όλα τα goals
  withoutPenalty: TotAvg; // goals όπου situation ≠ 'Penalty'
  penaltyGoal: TotAvg; // goals όπου situation = 'Penalty'
};

const round1 = (n: number) => Math.round(n * 10) / 10;

export async function getPlayerGoal(
  playerCustId: number
): Promise<GetPlayerGoalResponse> {
  const client = await pool.connect();
  try {
    const sql = `
      WITH filtered AS (
        SELECT
          match_cust_id,
          COALESCE(LOWER(situation), '') AS situation_lc,
          COALESCE(xg, 0.0)   AS xg,
          COALESCE(xgot, 0.0) AS xgot
        FROM public.match_player_shot
        WHERE player_cust_id = $1
          AND shot_type = 'goal'
      )
      SELECT
        -- totals (all goals)
        COUNT(*)                           AS total_goals,
        SUM(xg)                            AS total_xg,
        SUM(xgot)                          AS total_xgot,

        -- without penalty
        COUNT(*) FILTER (WHERE situation_lc NOT IN ('penalty','pen','penaltykick'))         AS no_pen_goals,
        SUM(xg)   FILTER (WHERE situation_lc NOT IN ('penalty','pen','penaltykick'))        AS no_pen_xg,
        SUM(xgot) FILTER (WHERE situation_lc NOT IN ('penalty','pen','penaltykick'))        AS no_pen_xgot,

        -- penalty only
        COUNT(*) FILTER (WHERE situation_lc IN ('penalty','pen','penaltykick'))             AS pen_goals,
        SUM(xg)   FILTER (WHERE situation_lc IN ('penalty','pen','penaltykick'))            AS pen_xg,
        SUM(xgot) FILTER (WHERE situation_lc IN ('penalty','pen','penaltykick'))            AS pen_xgot,

        -- distinct matches
        COUNT(DISTINCT match_cust_id)      AS matches
      FROM filtered;
    `;

    const { rows } = await client.query(sql, [playerCustId]);
    const r = rows[0] ?? {
      total_goals: 0,
      total_xg: 0,
      total_xgot: 0,
      no_pen_goals: 0,
      no_pen_xg: 0,
      no_pen_xgot: 0,
      pen_goals: 0,
      pen_xg: 0,
      pen_xgot: 0,
      matches: 0,
    };

    const matches = Number(r.matches ?? 0);

    const totalGoals = Number(r.total_goals ?? 0);
    const totalXg = Number(r.total_xg ?? 0);
    const totalXgot = Number(r.total_xgot ?? 0);

    const noPenGoals = Number(r.no_pen_goals ?? 0);
    const noPenXg = Number(r.no_pen_xg ?? 0);
    const noPenXgot = Number(r.no_pen_xgot ?? 0);

    const penGoals = Number(r.pen_goals ?? 0);
    const penXg = Number(r.pen_xg ?? 0);
    const penXgot = Number(r.pen_xgot ?? 0);

    const mk = (total: number, xGTotal: number, xGotTotal: number): TotAvg => ({
      total,
      avg: matches > 0 ? round1(total / matches) : 0,
      xGTotal: xGTotal,
      xGAvg: matches > 0 ? round1(xGTotal / matches) : 0,
      xGotTotal: xGotTotal,
      xGotAvg: matches > 0 ? round1(xGotTotal / matches) : 0,
    });

    return {
      playerCustId,
      matches,
      goals: mk(totalGoals, totalXg, totalXgot),
      withoutPenalty: mk(noPenGoals, noPenXg, noPenXgot),
      penaltyGoal: mk(penGoals, penXg, penXgot),
    };
  } finally {
    client.release();
  }
}
