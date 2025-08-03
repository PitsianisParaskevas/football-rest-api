// https://www.sofascore.com/football/match/bournemouth-leicester-city/Gskb#id:12436536

import type { MatchDayData } from "../types/MatchDayData";
import { fetchJson } from "../utils/fetchJson";
import { extractSofaIdsMatchDay } from "../utils/helpers";

import { transformPlayers } from "../functions/transformPlayers";
import { transformMatchPlayerStats } from "../functions/transformMatchPlayerStats";
import { transformMatchStats } from "../functions/transformMatchStats";

export class MatchDayService {
  private inputUrl: string;
  private matchId: number;
  private baseUrl: string;

  constructor(inputUrl: string) {
    this.inputUrl = inputUrl;

    const { id } = extractSofaIdsMatchDay(inputUrl);
    if (!id) {
      throw new Error("❌ Invalid Sofascore Match URL: could not extract ID.");
    }

    this.matchId = id;
    this.baseUrl = `https://www.sofascore.com/api/v1/event/${id}`;
  }

  private async fetchGeneral() {
    const url = `${this.baseUrl}`;
    const data = await fetchJson(url);
    return data.event; // <-- this is where homeTeam/awayTeam info is
  }

  async getMatchDayData(): Promise<MatchDayData> {
    const general = await this.fetchGeneral();

    const homeTeamId = general.homeTeam?.id;
    const awayTeamId = general.awayTeam?.id;

    const lineups = await fetchJson(`${this.baseUrl}/lineups`);
    const statistics = await fetchJson(`${this.baseUrl}/statistics`);

    const players = transformPlayers(lineups, homeTeamId, awayTeamId);
    const matchPalyerStats = transformMatchPlayerStats(this.matchId, lineups);

    const { match_statistics, metadata_statistics } = transformMatchStats(
      this.matchId,
      homeTeamId,
      awayTeamId,
      statistics.statistics
    );

    const metadata = [
      ...matchPalyerStats.metadata_statistics,
      ...metadata_statistics,
    ];

    // Return empty data for now — replace this later with real fetch/transform logic
    return {
      players,
      metadata_statistics: metadata,
      match_result: [],
      match_result_scenarios: [],
      match_stats: match_statistics,
      match_incident: [],
      match_player_info: [],
      match_player_stats: matchPalyerStats.player_stats,
      match_player_shot: [],
      match_player_heatmap: [],
    };
  }
}
