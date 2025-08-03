import type {
  MatchStatisticsRow,
  MetadataStatisticRow,
} from "../types/MatchTables";

interface SofaStatItem {
  key: string;
  name: string;
  homeValue?: number;
  awayValue?: number;
  home?: string;
  away?: string;
  homeTotal?: number;
  awayTotal?: number;
}

interface SofaStatGroup {
  groupName: string;
  statisticsItems: SofaStatItem[];
}

interface SofaStatPeriod {
  period?: string;
  groups?: SofaStatGroup[];
}

export function transformMatchStats(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  statistics: any
): {
  match_statistics: MatchStatisticsRow[];
  metadata_statistics: MetadataStatisticRow[];
} {
  const match_statistics: MatchStatisticsRow[] = [];
  const metadata_statistics: MetadataStatisticRow[] = [];
  const seenKeys = new Set<string>();

  const statsArray: SofaStatPeriod[] = Array.isArray(statistics)
    ? statistics
    : statistics && typeof statistics === "object"
    ? [statistics]
    : [];

  for (const period of statsArray) {
    const phase = period?.period || "ALL";

    for (const group of period.groups || []) {
      const groupName = group.groupName;

      for (const item of group.statisticsItems || []) {
        const {
          key,
          name,
          homeValue,
          awayValue,
          home,
          away,
          homeTotal,
          awayTotal,
        } = item;

        if (!key || !name) continue;

        // Push to metadata once per unique stat key
        if (!seenKeys.has(key)) {
          metadata_statistics.push({
            key,
            name,
            group: groupName,
            description: null,
          });
          seenKeys.add(key);
        }

        // Home stat row
        match_statistics.push({
          match_cust_id: matchId,
          team_cust_id: homeTeamId,
          team_side: "home",
          stat_key: key,
          phase,
          value: typeof homeValue === "number" ? homeValue : null,
          display: typeof home === "string" ? home : null,
          total: typeof homeTotal === "number" ? homeTotal : null,
        });

        // Away stat row
        match_statistics.push({
          match_cust_id: matchId,
          team_cust_id: awayTeamId,
          team_side: "away",
          stat_key: key,
          phase,
          value: typeof awayValue === "number" ? awayValue : null,
          display: typeof away === "string" ? away : null,
          total: typeof awayTotal === "number" ? awayTotal : null,
        });
      }
    }
  }

  return {
    match_statistics,
    metadata_statistics,
  };
}
