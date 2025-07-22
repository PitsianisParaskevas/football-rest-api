import axios from "axios";

// get sofa Ids for the genera data
export function extractSofaIds(sofaURL: string): {
  tournamentId: number | null;
  seasonId: number | null;
} {
  const tournamentMatch = sofaURL.match(
    /tournament\/football\/[^/]+\/[^/]+\/(\d+)/
  );
  const seasonMatch = sofaURL.match(/id:(\d+)/);

  const tournamentId = tournamentMatch ? parseInt(tournamentMatch[1]) : null;
  const seasonId = seasonMatch ? parseInt(seasonMatch[1]) : null;

  return { tournamentId, seasonId };
}

export async function getStandingsData(tournamentId: number, seasonId: number) {
  const url = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}/standings/total`;

  try {
    const res = await axios.get(url);
    return res.data.standings;
  } catch (err: any) {
    console.error("❌ Error fetching standings:", err.message);
    return null;
  }
}

export function transformStandingsData(standingsArray: any[]) {
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
    teams: standings.rows.map((row: any) => ({
      cust_id: row.team.id,
      name: row.team.name,
      slug: row.team.slug,
      shortName: row.team.shortName,
      nameCode: row.team.nameCode,
      countryName: row.team.country.name,
      countrySlug: row.team.country.slug,
    })),
    rounds: tournament_team.length * 2 - 2,
    tournament_team,
  };
}

export async function getAllRoundMatches(
  tournamentId: number,
  seasonId: number,
  totalRounds: number
) {
  const apiUrl = `https://www.sofascore.com/api/v1/unique-tournament/${tournamentId}/season/${seasonId}`;
  // console.log(apiUrl)
  const allMatches: any[] = [];

  for (let round = 1; round <= totalRounds; round++) {
    const url = `${apiUrl}/events/round/${round}`;

    try {
      const res = await axios.get(url);
      const matches = res.data.events;

      const roundMatches = matches.map((match: any) => ({
        tournament_id: tournamentId,
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

// Define the shape of the returned general data
export interface GeneralData {
  tournament: any;
  teams: any[];
  tournament_team: any[];
  matches: any[];
}

// Main logic to get all general data in one go
export async function getGeneralData(url: string): Promise<GeneralData | null> {
  const { tournamentId, seasonId } = extractSofaIds(url);

  if (!tournamentId || !seasonId) {
    console.error("❌ Invalid URL – missing tournament or season ID");
    return null;
  }

  const standings = await getStandingsData(tournamentId, seasonId);
  if (!standings) {
    console.error("❌ No standings data received");
    return null;
  }

  const transformed = transformStandingsData(standings);
  if (!transformed) {
    console.error("❌ Failed to transform standings data");
    return null;
  }

  const { tournament, teams, tournament_team, rounds } = transformed;

  const matches = await getAllRoundMatches(tournamentId, seasonId, rounds);
  if (!matches || matches.length === 0) {
    console.warn("⚠️ No matches found");
  }

  return {
    tournament,
    teams,
    tournament_team,
    matches,
  };
}
