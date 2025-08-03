// https://www.sofascore.com/football/match/bournemouth-leicester-city/Gskb#id:12436536

import type { MatchDayData } from "../types/MatchDayData";
import type { MatchIncidentRow, MatchResultRow } from "../types/MatchTables";

import { fetchJson } from "../utils/fetchJson";
import { extractSofaIdsMatchDay } from "../utils/helpers";

import { transformPlayers } from "../functions/transformPlayers";
import { transformMatchPlayerStats } from "../functions/transformMatchPlayerStats";
import { transformMatchStats } from "../functions/transformMatchStats";
import { transformMatchIncidents } from "../functions/transformMatchIncidents";

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

  private getFormation(lineups: any): {
    home: string | null;
    away: string | null;
  } {
    const isConfirmed = lineups?.confirmed;

    return {
      home: isConfirmed ? lineups?.home?.formation ?? null : null,
      away: isConfirmed ? lineups?.away?.formation ?? null : null,
    };
  }

  private getMatchScoresFromPeriodIncidents(incidents: any[]): {
    home_score_ht: number | null;
    away_score_ht: number | null;
    home_score_ft: number;
    away_score_ft: number;
  } {
    const ht = incidents.find(
      (i) => i.incidentType === "period" && i.text === "HT"
    );

    const ft = incidents.find(
      (i) => i.incidentType === "period" && i.text === "FT"
    );

    return {
      home_score_ht: ht?.homeScore ?? null,
      away_score_ht: ht?.awayScore ?? null,
      home_score_ft: ft?.homeScore ?? 0,
      away_score_ft: ft?.awayScore ?? 0,
    };
  }

  private getResult(score: number, opponent: number): "win" | "loss" | "draw" {
    if (score > opponent) return "win";
    if (score < opponent) return "loss";
    return "draw";
  }

  private buildMatchResult(
    matchId: number,
    lineups: any,
    rawIncidents: any[]
  ): MatchResultRow[] {
    const { home: homeFormation, away: awayFormation } =
      this.getFormation(lineups);

    const { home_score_ht, away_score_ht, home_score_ft, away_score_ft } =
      this.getMatchScoresFromPeriodIncidents(rawIncidents);

    const home_result = this.getResult(home_score_ft, away_score_ft);
    const away_result = this.getResult(away_score_ft, home_score_ft);

    return [
      {
        match_cust_id: matchId,
        home_score_ft,
        away_score_ft,
        home_score_ht,
        away_score_ht,
        home_formation: homeFormation,
        away_formation: awayFormation,
        home_result,
        away_result,
      },
    ];
  }

  async getMatchDayData(): Promise<MatchDayData> {
    const general = await this.fetchGeneral();
    const lineups = await fetchJson(`${this.baseUrl}/lineups`);
    const statistics = await fetchJson(`${this.baseUrl}/statistics`);
    const incidents = await fetchJson(`${this.baseUrl}/incidents`);

    const homeTeamId = general.homeTeam?.id;
    const awayTeamId = general.awayTeam?.id;
    const rawIncidents = incidents.incidents;

    const players = transformPlayers(lineups, homeTeamId, awayTeamId);
    const matchPalyerStats = transformMatchPlayerStats(this.matchId, lineups);
    const { match_statistics, metadata_statistics } = transformMatchStats(
      this.matchId,
      homeTeamId,
      awayTeamId,
      statistics.statistics
    );
    const match_incident = transformMatchIncidents(this.matchId, rawIncidents);

    const match_result = this.buildMatchResult(
      this.matchId,
      lineups,
      rawIncidents
    );

    console.log("match_result", match_result);

    const metadata = [
      ...matchPalyerStats.metadata_statistics,
      ...metadata_statistics,
    ];

    // Return empty data for now — replace this later with real fetch/transform logic
    return {
      players,
      metadata_statistics: metadata,
      match_result,
      match_result_scenarios: [],
      match_stats: match_statistics,
      match_incident,
      match_player_info: [],
      match_player_stats: matchPalyerStats.player_stats,
      match_player_shot: [],
      match_player_heatmap: [],
    };
  }
}
