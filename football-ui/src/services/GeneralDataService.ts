// https://www.sofascore.com/tournament/football/england/premier-league/17#id:61627

import axios from "axios";
import { extractSofaIdsGeneralData } from "../utils/helpers";
import type { GeneralData } from "../types/GeneralData";

export class GeneralDataService {
  private inputUrl: string;
  private tournamentId: number;
  private seasonId: number;

  constructor(inputUrl: string) {
    this.inputUrl = inputUrl;
    const { tournamentId, seasonId } = extractSofaIdsGeneralData(inputUrl);
    if (!tournamentId || !seasonId) {
      throw new Error(
        "❌ Invalid Sofascore URL – missing tournament or season ID."
      );
    }

    this.tournamentId = tournamentId;
    this.seasonId = seasonId;
  }

  async getGeneralData(): Promise<GeneralData | null> {
    const standings = await this.fetchStandings();
    if (!standings) return null;

    const transformed = this.transformStandings(standings);
    if (!transformed) return null;

    const matches = await this.fetchAllMatches(transformed.rounds);

    return {
      tournament: transformed.tournament,
      teams: transformed.teams,
      tournament_team: transformed.tournament_team,
      matches,
    };
  }

  private async fetchStandings() {
    const url = `https://www.sofascore.com/api/v1/unique-tournament/${this.tournamentId}/season/${this.seasonId}/standings/total`;
    try {
      const res = await axios.get(url);
      return res.data.standings;
    } catch (err: any) {
      console.error("❌ Error fetching standings:", err.message);
      return null;
    }
  }

  private transformStandings(standingsArray: any[]) {
    if (!Array.isArray(standingsArray) || standingsArray.length === 0) {
      console.warn("⚠️ Invalid standings array");
      return null;
    }

    const standings = standingsArray[0];
    const tournamentId = standings.tournament.uniqueTournament.id;

    const tournament_team = standings.rows.map((row: any) => ({
      tournament_cust_id: tournamentId,
      team_cust_id: row.team.id,
    }));

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

    return {
      tournament: {
        cust_id: tournamentId,
        name: standings.tournament.uniqueTournament.name,
        slug: standings.tournament.uniqueTournament.slug,
        countryName: standings.tournament.uniqueTournament.category.name,
        countrySlug: standings.tournament.uniqueTournament.category.slug,
        rounds: tournament_team.length * 2 - 2,
        total_teams: tournament_team.length,
      },
      teams,
      rounds: tournament_team.length * 2 - 2,
      tournament_team,
    };
  }

  private async fetchAllMatches(totalRounds: number) {
    const apiUrl = `https://www.sofascore.com/api/v1/unique-tournament/${this.tournamentId}/season/${this.seasonId}`;
    const allMatches: any[] = [];

    for (let round = 1; round <= totalRounds; round++) {
      const url = `${apiUrl}/events/round/${round}`;

      try {
        const res = await axios.get(url);
        const matches = res.data.events;

        const roundMatches = matches.map((match: any) => ({
          tournament_id: this.tournamentId,
          cust_id: match.id,
          round: match.roundInfo?.round ?? round,
          match_date: new Date(match.startTimestamp * 1000).toISOString(),
          home_team_id: match.homeTeam.id,
          away_team_id: match.awayTeam.id,
        }));

        allMatches.push(...roundMatches);
      } catch (err: any) {
        console.warn(`⚠️ Round ${round} failed:`, err.message);
      }
    }

    return allMatches;
  }
}
