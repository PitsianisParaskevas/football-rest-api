// src/services/MatchDayService.ts
import type { MatchDayData } from "../types/MatchDayData";
import type { MatchResultRow } from "../types/MatchTables";

import { fetchJson } from "../utils/fetchJson";
import { extractSofaIdsMatchDay } from "../utils/helpers";

import { transformPlayers } from "../functions/transformPlayers";
import { transformMatchPlayerStats } from "../functions/transformMatchPlayerStats";
import { transformMatchStats } from "../functions/transformMatchStats";
import { transformMatchIncidents } from "../functions/transformMatchIncidents";
import { transformMatchPlayerInfo } from "../functions/transformMatchPlayerInfo";
import { transformMatchResultScenarios } from "../functions/transformMatchResultScenarios";
import { transformShotMap } from "../functions/transformShotMap";
import { transformHeatMap } from "../functions/transformHeatMap";

type CtorArg = number | string | { id: number } | { url: string };

export class MatchDayService {
  private matchId: number;
  private baseUrl: string;

  constructor(id: number);
  constructor(url: string);
  constructor(opts: { id: number } | { url: string });
  constructor(arg: CtorArg) {
    const id = MatchDayService.resolveId(arg);
    this.matchId = id;
    // IMPORTANT: route via your proxy (vite -> :4000 server -> Sofascore)
    this.baseUrl = `/api/sofa/event/${id}`;
  }

  static async getById(eventId: number): Promise<MatchDayData> {
    return new MatchDayService(eventId).getMatchDayData();
  }

  /** Accepts: number, numeric string, Sofascore URL with #id:, {id}, {url} */
  private static resolveId(arg: CtorArg): number {
    if (typeof arg === "number") {
      if (Number.isFinite(arg) && arg > 0) return arg;
      throw new Error("❌ Invalid event id (number).");
    }

    if (typeof arg === "string") {
      const asNum = Number(arg);
      if (Number.isFinite(asNum) && asNum > 0) return asNum;
      const { id } = extractSofaIdsMatchDay(arg);
      if (!id) throw new Error("❌ Invalid Sofascore Match URL: could not extract ID.");
      return id;
    }

    if ("id" in arg) {
      const n = Number(arg.id);
      if (Number.isFinite(n) && n > 0) return n;
      throw new Error("❌ Invalid event id in { id }.");
    }
    if ("url" in arg) {
      const { id } = extractSofaIdsMatchDay(arg.url);
      if (!id) throw new Error("❌ Invalid Sofascore Match URL: could not extract ID.");
      return id;
    }

    throw new Error("❌ Invalid MatchDayService argument.");
  }

  private async fetchGeneral() {
    const data = await fetchJson(this.baseUrl);
    return data.event; // homeTeam/awayTeam info
  }

  private getFormation(lineups: any): { home: string | null; away: string | null } {
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
    const ht = incidents.find((i) => i.incidentType === "period" && i.text === "HT");
    const ft = incidents.find((i) => i.incidentType === "period" && i.text === "FT");
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
    const { home: homeFormation, away: awayFormation } = this.getFormation(lineups);
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

  private async fetchPlayerHeatmap(playerId: number): Promise<any> {
    return await fetchJson(`${this.baseUrl}/player/${playerId}/heatmap`);
  }

  async getMatchDayData(): Promise<MatchDayData> {
    const general = await this.fetchGeneral();
    const lineups = await fetchJson(`${this.baseUrl}/lineups`);
    const statistics = await fetchJson(`${this.baseUrl}/statistics`);
    const incidents = await fetchJson(`${this.baseUrl}/incidents`);
    const shotmap = await fetchJson(`${this.baseUrl}/shotmap`);

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
    const match_incident = transformMatchIncidents(
      this.matchId,
      homeTeamId,
      awayTeamId,
      rawIncidents
    );
    const match_result = this.buildMatchResult(this.matchId, lineups, rawIncidents);

    const lineupPlayers = [
      ...(lineups?.home?.players ?? []),
      ...(lineups?.away?.players ?? []),
    ];

    const match_player_info = transformMatchPlayerInfo(
      this.matchId,
      rawIncidents,
      lineupPlayers
    );

    const match_result_scenarios = transformMatchResultScenarios({
      match_id: this.matchId,
      home_team_id: homeTeamId,
      away_team_id: awayTeamId,
      incidents: match_incident?.match_incident ?? [],
    });

    const match_player_shot = transformShotMap({
      match_cust_id: this.matchId,
      shots: shotmap?.shotmap ?? [],
    });

    const playerList = lineupPlayers.filter((p) => p?.id || p?.player?.id);

    const match_player_heatmap = await transformHeatMap({
      match_cust_id: this.matchId,
      player_list: playerList.map((p) => ({ id: p.id ?? p.player?.id })),
      fetchPlayerHeatmap: this.fetchPlayerHeatmap.bind(this),
    });

    const metadata = [
      ...matchPalyerStats.metadata_statistics,
      ...metadata_statistics,
      ...match_incident.metadata_statistics,
    ];

    return {
      players,
      metadata_statistics: metadata,
      match_result,
      match_result_scenarios,
      match_stats: match_statistics,
      match_incident: match_incident.match_incident,
      match_player_info,
      match_player_stats: matchPalyerStats.player_stats,
      match_player_shot,
      match_player_heatmap,
    };
  }
}

export default MatchDayService;
