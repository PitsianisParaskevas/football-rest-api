import type {
  MatchStatsRow,
  MatchResultRow,
  MatchResultScenarioRow,
  MatchIncidentRow,
  MatchPlayerInfoRow,
  MatchPlayerStatsRow,
  MatchPlayerShotRow,
  MatchPlayerHeatmapRow,
  MetadataStatisticRow,
  PlayerRow,
} from "./MatchTables";

export interface MatchDayData {
  players: PlayerRow[];
  metadata_statistics: MetadataStatisticRow[];
  match_result: MatchResultRow[];
  match_result_scenarios: MatchResultScenarioRow[];
  match_stats: MatchStatsRow[];
  match_incident: MatchIncidentRow[];
  match_player_info: MatchPlayerInfoRow[];
  match_player_stats: MatchPlayerStatsRow[];
  match_player_shot: MatchPlayerShotRow[];
  match_player_heatmap: MatchPlayerHeatmapRow[];
}
