import {
  extractSofaIds,
  getAllRoundMatches,
  getStandingsData,
  transformStandingsData,
} from "./functions";

export async function runScheduleFetch(sofaURL: string) {
  const { tournamentId, seasonId } = extractSofaIds(sofaURL);
  if (!tournamentId || !seasonId) {
    console.error("❌ Invalid URL – missing tournament or season ID");
    return;
  }

  const standings = await getStandingsData(tournamentId, seasonId);
  const leagueData = transformStandingsData(standings);

  // console.log("✅ League Data:", leagueData);

  const matches = await getAllRoundMatches(
    tournamentId,
    seasonId,
    leagueData?.rounds ?? 38 // use 38 if leagueData.rounds is null or undefined
  );

  // console.log("✅ All Matches:", matches);
  return { matches, leagueData };
}
