import type { MatchPlayerHeatmapRow } from "../types/MatchTables";

export async function transformHeatMap({
  match_cust_id,
  player_list,
  fetchPlayerHeatmap,
}: {
  match_cust_id: number;
  player_list: { id: number }[];
  fetchPlayerHeatmap: (playerId: number) => Promise<any>;
}): Promise<MatchPlayerHeatmapRow[]> {
  const result: MatchPlayerHeatmapRow[] = [];

  for (const player of player_list) {
    try {
      const data = await fetchPlayerHeatmap(player.id);

      result.push({
        match_cust_id,
        player_cust_id: player.id,
        details_json: data ?? {},
      });
    } catch (err: any) {
      if (err?.response?.status === 404) {
        console.warn(`⚠️ No heatmap data for player ${player.id} (404)`);
        continue;
      }

      console.error(`❌ Error fetching heatmap for player ${player.id}`, err);
    }
  }

  return result;
}
