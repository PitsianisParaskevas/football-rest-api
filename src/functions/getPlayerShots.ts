import { pool } from "@/db/client";

type SplitKey = "ALL" | "HOME" | "AWAY";

type TotAvg = { total: number; avg: number };
type SituationAgg = Record<string, TotAvg>;

export type GetPlayerShotsResponse = {
  playerCustId: number;
  filter?: { shot_type?: string | null };
  splits: Record<
    SplitKey,
    {
      matches: number;
      situation: SituationAgg;
      goals: TotAvg;
      goalWithoutPenalty: TotAvg;
    }
  >;
};

const round1 = (n: number) => Math.round(n * 10) / 10;

const SPLITS: { key: SplitKey; where: string }[] = [
  { key: "ALL", where: "TRUE" },
  { key: "HOME", where: "is_home = TRUE" },
  { key: "AWAY", where: "is_home = FALSE" },
];

/**
 * getPlayerShots(playerCustId, shot_type?)
 * - shot_type optional global filter (e.g. 'goal' or 'penalty' or 'header' κλπ)
 * - groups by situation and returns total + avg per distinct match
 * - also returns goals & goalWithoutPenalty buckets with total + avg
 */
export async function getPlayerShots(
  playerCustId: number,
  shot_type?: string | null
): Promise<GetPlayerShotsResponse> {
  const client = await pool.connect();
  try {
    const res: GetPlayerShotsResponse = {
      playerCustId,
      filter: { shot_type: shot_type ?? null },
      splits: {
        ALL: {
          matches: 0,
          situation: {},
          goals: { total: 0, avg: 0 },
          goalWithoutPenalty: { total: 0, avg: 0 },
        },
        HOME: {
          matches: 0,
          situation: {},
          goals: { total: 0, avg: 0 },
          goalWithoutPenalty: { total: 0, avg: 0 },
        },
        AWAY: {
          matches: 0,
          situation: {},
          goals: { total: 0, avg: 0 },
          goalWithoutPenalty: { total: 0, avg: 0 },
        },
      },
    };

    // Βάση φίλτρων (player + optional shot_type)
    const baseWhere = `
      player_cust_id = $1
      ${shot_type ? "AND shot_type = $2" : ""}
    `;

    // Τρέχουμε όλα τα splits παράλληλα
    const promises = SPLITS.map(async ({ key, where }) => {
      // Πόσα distinct matches υπάρχουν στο split -> για division στο avg
      const qMatches = `
        SELECT COUNT(DISTINCT cust_match_id) AS matches
        FROM match_player_shot
        WHERE ${baseWhere} AND (${where})
      `;
      const matchesParams = shot_type
        ? [playerCustId, shot_type]
        : [playerCustId];
      const { rows: rowsMatches } = await client.query(qMatches, matchesParams);
      const matches = Number(rowsMatches[0]?.matches ?? 0);

      // Group by situation (σύνολο shots ανά situation)
      const qSituations = `
        SELECT COALESCE(NULLIF(situation, ''), 'Unknown') AS situation, COUNT(*) AS total
        FROM match_player_shot
        WHERE ${baseWhere} AND (${where})
        GROUP BY COALESCE(NULLIF(situation, ''), 'Unknown')
      `;
      const { rows: rowsSituations } = await client.query(
        qSituations,
        matchesParams
      );

      // Goals & goalWithoutPenalty (ανεξάρτητα από shot_type filter ΔΕΝ αλλάζουμε τη λογική —
      // παραμένουν στο ίδιο subset, άρα τιμώνται από το global filter αν δοθεί)
      const qGoals = `
        SELECT
          COUNT(*) FILTER (WHERE shot_result = 'goal') AS goals_total,
          COUNT(*) FILTER (
            WHERE shot_result = 'goal' AND (COALESCE(is_penalty, (shot_type = 'penalty')) = FALSE)
          ) AS goal_wo_pen_total
        FROM match_player_shot
        WHERE ${baseWhere} AND (${where})
      `;
      const { rows: rowsGoals } = await client.query(qGoals, matchesParams);
      const goalsTotal = Number(rowsGoals[0]?.goals_total ?? 0);
      const goalWoPenTotal = Number(rowsGoals[0]?.goal_wo_pen_total ?? 0);

      // Στήσιμο αντικειμένου
      const situation: SituationAgg = {};
      for (const r of rowsSituations) {
        const total = Number(r.total ?? 0);
        const avg = matches > 0 ? round1(total / matches) : 0;
        situation[r.situation] = { total, avg };
      }

      res.splits[key] = {
        matches,
        situation,
        goals: {
          total: goalsTotal,
          avg: matches > 0 ? round1(goalsTotal / matches) : 0,
        },
        goalWithoutPenalty: {
          total: goalWoPenTotal,
          avg: matches > 0 ? round1(goalWoPenTotal / matches) : 0,
        },
      };
    });

    await Promise.all(promises);
    return res;
  } finally {
    client.release();
  }
}
