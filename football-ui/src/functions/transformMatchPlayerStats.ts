import type {
  MatchPlayerStatsRow,
  MetadataStatisticRow,
} from "../types/MatchTables";
import { isNestedObject } from "../utils/helpers";

export function transformMatchPlayerStats(
  matchId: number,
  lineups: any
): {
  player_stats: MatchPlayerStatsRow[];
  metadata_statistics: MetadataStatisticRow[];
} {
  const player_stats: MatchPlayerStatsRow[] = [];
  const metadataMap = new Map<string, MetadataStatisticRow>();

  const processTeam = (players: any[]) => {
    players.forEach((p) => {
      const player = p.player;
      if (!player?.id || !p.statistics) return;

      for (const statKey in p.statistics) {
        const value = p.statistics[statKey];

        if (isNestedObject(value)) {
          for (const nestedKey in value) {
            const fullKey = `${statKey}.${nestedKey}`;
            player_stats.push({
              match_cust_id: matchId,
              player_cust_id: player.id,
              stat_key: fullKey,
              stat_value: value[nestedKey] ?? null,
            });
            if (!metadataMap.has(fullKey)) {
              metadataMap.set(fullKey, {
                key: fullKey,
                name: nestedKey,
                group: statKey,
                description: null,
              });
            }
          }
        } else {
          player_stats.push({
            match_cust_id: matchId,
            player_cust_id: player.id,
            stat_key: statKey,
            stat_value: value ?? null,
          });
          if (!metadataMap.has(statKey)) {
            metadataMap.set(statKey, {
              key: statKey,
              name: `player_stat_${statKey}`,
              group: "general",
              description: null,
            });
          }
        }
      }
    });
  };

  processTeam(lineups.home?.players || []);
  processTeam(lineups.away?.players || []);

  return {
    player_stats,
    metadata_statistics: Array.from(metadataMap.values()),
  };
}
