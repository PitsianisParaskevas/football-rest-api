// src/services/GeneralDataService.ts
// Example URL: https://www.sofascore.com/tournament/football/england/premier-league/17#id:61627

import { extractSofaIdsGeneralData } from "../utils/helpers";
import type { GeneralData } from "../types/GeneralData";
import { fetchJson } from "../utils/fetchJson";

const PROXY_BASE = "/api/sofa"; // Always go through your Express proxy!

export class GeneralDataService {
  private inputUrl: string;
  private tournamentId: number;
  private seasonId: number;

  constructor(inputUrl: string) {
    this.inputUrl = inputUrl;

    // Extract IDs from the SofaScore tournament URL
    const { tournamentId, seasonId } = extractSofaIdsGeneralData(inputUrl);
    if (!tournamentId || !seasonId) {
      throw new Error(
        "❌ Invalid Sofascore URL – missing tournament or season ID."
      );
    }

    this.tournamentId = tournamentId;
    this.seasonId = seasonId;
  }

  /**
   * Fetches general data: tournament, teams, tournament-team mapping, matches.
   */
  async getGeneralData(): Promise<GeneralData | null> {
    // 1. Fetch standings (try /standings first, fallback to /standings/total)
    const standings = await this.fetchStandings();
    if (!standings) return null;

    // 2. Transform standings into tournament + team info
    const transformed = this.transformStandings(standings);
    if (!transformed) return null;

    // 3. Fetch all matches round by round
    const matches = await this.fetchAllMatches(transformed.rounds);

    // 4. Return structured GeneralData
    return {
      tournament: transformed.tournament,
      teams: transformed.teams,
      tournament_team: transformed.tournament_team,
      matches,
    };
  }

  /**
   * Fetches standings using proxy. First tries `/standings`, then `/standings/total`.
   */
  private async fetchStandings() {
    const base = `${PROXY_BASE}/unique-tournament/${this.tournamentId}/season/${this.seasonId}`;

    // Try /standings first (most reliable)
    try {
      const data = await fetchJson<any>(`${base}/standings`);
      if (Array.isArray(data?.standings) && data.standings.length > 0) {
        return data.standings;
      }
    } catch (err: any) {
      console.warn("⚠️ /standings failed:", err?.message ?? err);
    }

    // Fallback: /standings/total (older tournaments sometimes need this)
    try {
      const data = await fetchJson<any>(`${base}/standings/total`);
      return data?.standings ?? null;
    } catch (err: any) {
      console.error("❌ Error fetching standings:", err?.message ?? err);
      return null;
    }
  }

  /**
   * Converts raw standings into structured tournament, teams, and mapping info.
   */
  private transformStandings(standingsArray: any[]) {
    if (!Array.isArray(standingsArray) || standingsArray.length === 0) {
      console.warn("⚠️ Invalid standings array");
      return null;
    }

    const standings = standingsArray[0];
    const tournamentId = standings.tournament.uniqueTournament.id;

    // Tournament-team mapping (join table)
    const tournament_team = standings.rows.map((row: any) => ({
      tournament_cust_id: tournamentId,
      team_cust_id: row.team.id,
    }));

    // Teams list
    const teams = standings.rows
      .map((row: any) => ({
        cust_id: row.team.id,
        name: row.team.name,
        slug: row.team.slug,
        shortName: row.team.shortName,
        nameCode: row.team.nameCode,
        countryName: row.team.country.name,
        countrySlug: row.team.country.slug,
      }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    // Double round-robin → (N - 1) * 2
    const totalTeams = tournament_team.length;
    const rounds = (totalTeams - 1) * 2;

    return {
      tournament: {
        cust_id: tournamentId,
        name: standings.tournament.uniqueTournament.name,
        slug: standings.tournament.uniqueTournament.slug,
        countryName: standings.tournament.uniqueTournament.category.name,
        countrySlug: standings.tournament.uniqueTournament.category.slug,
        rounds,
        total_teams: totalTeams,
      },
      teams,
      rounds,
      tournament_team,
    };
  }

  /**
   * Fetches all matches for all rounds in parallel (fast + resilient).
   */
  private async fetchAllMatches(totalRounds: number) {
    const base = `${PROXY_BASE}/unique-tournament/${this.tournamentId}/season/${this.seasonId}`;
    const rounds = Array.from({ length: totalRounds }, (_, i) => i + 1);

    // Fetch rounds concurrently, but catch per-round failures
    const tasks = rounds.map(async (round) => {
      const url = `${base}/events/round/${round}`;
      try {
        const data = await fetchJson<any>(url);
        const matches = data?.events ?? [];
        return matches.map((match: any) => ({
          tournament_id: this.tournamentId,
          cust_id: match.id,
          round: match.roundInfo?.round ?? round,
          match_date: new Date(match.startTimestamp * 1000).toISOString(),
          home_team_id: match.homeTeam.id,
          away_team_id: match.awayTeam.id,
        }));
      } catch (err: any) {
        console.warn(`⚠️ Round ${round} failed:`, err?.message ?? err);
        return [];
      }
    });

    // Wait for all rounds, even if some fail
    const settled = await Promise.allSettled(tasks);
    const allMatches: any[] = [];
    for (const s of settled) {
      if (s.status === "fulfilled") {
        allMatches.push(...s.value);
      }
    }
    return allMatches;
  }
}
