import axios from "axios";
import { getScenarioList } from "./utils/scenario.utils";

import type { MatchResultRow } from "./types/MatchResultRow";

import type { MatchDayData } from "./types/MatchDayData";
import { MatchDayService } from "./services/MatchDayService";

/**
 *  ************ Helper function ************
 */

export function extractSofaIdsGeneralData(sofaURL: string): {
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

export function extractSofaIdsMatchDay(sofaURL: string): { id: number | null } {
  const idMatch = sofaURL.match(/id:(\d+)/);
  return { id: idMatch ? parseInt(idMatch[1], 10) : null };
}

/**
 *  ************ General Data ************
 */

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
    .sort((a: { name: string }, b: { name: string }) =>
      a.name.localeCompare(b.name)
    );

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
  const { tournamentId, seasonId } = extractSofaIdsGeneralData(url);

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

/**
 *  ************ Match Day ************
 */

// function findResult(home: number, away: number) {
//   const result = {
//     home: { points: 0, result: "", goalFor: home, goalAgainst: away },
//     away: { points: 0, result: "", goalFor: away, goalAgainst: home },
//   };

//   if (home > away) {
//     result.home.points = 3;
//     result.home.result = "win";
//     result.away.points = 0;
//     result.away.result = "lose";
//   } else if (home === away) {
//     result.home.points = 1;
//     result.home.result = "draw";
//     result.away.points = 1;
//     result.away.result = "draw";
//   } else {
//     result.home.points = 0;
//     result.home.result = "lose";
//     result.away.points = 3;
//     result.away.result = "win";
//   }

//   return result;
// }

// export function transformStatistics(data: any): TransformedStatistics {
//   const output: TransformedStatistics = {
//     metadata: [],
//     home: {},
//     away: {},
//   };

//   const seenKeys = new Set<string>();

//   // assume data is the array of periods
//   data.forEach((periodData: any) => {
//     const period = periodData.period;
//     output.home[period] = {};
//     output.away[period] = {};

//     periodData.groups.forEach((group: any) => {
//       const groupName = group.groupName;
//       group.statisticsItems.forEach((item: any) => {
//         const key = item.key || item.name;

//         if (!seenKeys.has(key)) {
//           output.metadata.push({
//             key,
//             name: item.name,
//             group: groupName,
//           });
//           seenKeys.add(key);
//         }
//         output.home[period][key] = {
//           value: item.homeValue,
//           display: item.home,
//           ...(item.homeTotal !== undefined && { total: item.homeTotal }),
//         };
//         output.away[period][key] = {
//           value: item.awayValue,
//           display: item.away,
//           ...(item.awayTotal !== undefined && { total: item.awayTotal }),
//         };
//       });
//     });
//   });

//   return output;
// }

// export function transformLineups(
//   data: any
// ): TransformedLineups & { players: any[] } {
//   const statisticsKeys = new Set<string>();

//   function processTeam(team: any): TransformedLineups["home"] {
//     const players: TransformedLineups["home"]["players"] = [];
//     const statisticsPlayer: TransformedLineups["home"]["statisticsPlayer"] = [];
//     const missingPlayers: TransformedLineups["home"]["missingPlayers"] = [];

//     // map main squad
//     team.players.forEach((item: any) => {
//       const p = item.player;
//       players.push({
//         id: p.id,
//         name: p.name,
//         firstName: p.firstName ?? "",
//         lastName: p.lastName ?? "",
//         slug: p.slug,
//         shortName: p.shortName,
//         position: item.position,
//         jerseyNumber: item.jerseyNumber,
//         height: p.height,
//         userCount: p.userCount,
//         country: p.country,
//         marketValueCurrency: p.marketValueCurrency,
//         dateOfBirthTimestamp: p.dateOfBirthTimestamp,
//         proposedMarketValueRaw: p.proposedMarketValueRaw,
//         teamId: item.teamId,
//         shirtNumber: item.jerseyNumber ? Number(item.jerseyNumber) : "",
//       });

//       const stats = item.statistics || {};
//       Object.keys(stats).forEach((k) => statisticsKeys.add(k));
//       statisticsPlayer.push({
//         id: p.id,
//         name: p.name,
//         userCount: p.userCount,
//         proposedMarketValueRaw: p.proposedMarketValueRaw,
//         substitute:
//           item.substitute && Object.keys(stats).length === 0
//             ? "noSubstitute"
//             : item.substitute,
//         statistics: stats as Record<string, number>,
//       });
//     });

//     // missing/doubtful
//     (team.missingPlayers || []).forEach((m: any) => {
//       const p = m.player;
//       missingPlayers.push({
//         id: p.id,
//         name: p.name,
//         userCount: p.userCount,
//         type: m.type,
//         reason: m.reason,
//       });
//       // also add to full roster
//       players.push({
//         id: p.id,
//         name: p.name,
//         firstName: p.firstName ?? "",
//         lastName: p.lastName ?? "",
//         slug: p.slug,
//         shortName: p.shortName,
//         position: p.position,
//         jerseyNumber: p.jerseyNumber,
//         height: p.height,
//         userCount: p.userCount,
//         country: p.country,
//         marketValueCurrency: p.marketValueCurrency,
//         dateOfBirthTimestamp: p.dateOfBirthTimestamp,
//         proposedMarketValueRaw: p.proposedMarketValueRaw,
//         teamId: null,
//         shirtNumber: "",
//       });
//     });

//     let best: {
//       id: number;
//       name: string;
//       userCount: number;
//       rating: number;
//     } | null = null;

//     for (const sp of statisticsPlayer) {
//       const rating = Number(sp.statistics.rating) || 0;
//       if (!best || rating > best.rating) {
//         best = { id: sp.id, name: sp.name, userCount: sp.userCount, rating };
//       }
//     }

//     return {
//       formation: team.formation,
//       players,
//       statisticsPlayer,
//       missingPlayers,
//       bestPlayer: best,
//     };
//   }

//   const home = processTeam(data.home);
//   const away = processTeam(data.away);

//   return {
//     metadata: { statisticsKeys: Array.from(statisticsKeys) },
//     home,
//     away,
//     players: [...home.players, ...away.players],
//   };
// }

// export function transformIncident(data: any): TransformedIncidents {
//   const output: TransformedIncidents = {
//     metadata: {},
//     fullTimeScore: { homeScore: 0, awayScore: 0 },
//     halfTimeScore: { homeScore: 0, awayScore: 0 },
//     home: {
//       points: 0,
//       result: "",
//       goalFor: 0,
//       goalAgainst: 0,
//       incidents: {
//         goal: [],
//         card: [],
//         assist: [],
//         injury: [],
//         penalty: [],
//         substitutions: [],
//       },
//     },
//     away: {
//       points: 0,
//       result: "",
//       goalFor: 0,
//       goalAgainst: 0,
//       incidents: {
//         goal: [],
//         card: [],
//         assist: [],
//         injury: [],
//         penalty: [],
//         substitutions: [],
//       },
//     },
//   };

//   // Temporary map of Sets to collect each class per type
//   const metaMap: Record<string, Set<string>> = {};

//   for (const incident of data.incidents) {
//     // Period markers
//     if (incident.incidentType === "period") {
//       if (incident.text === "FT") {
//         output.fullTimeScore = {
//           homeScore: incident.homeScore,
//           awayScore: incident.awayScore,
//         };
//         const { home, away } = findResult(
//           incident.homeScore,
//           incident.awayScore
//         );
//         output.home = { ...output.home, ...home };
//         output.away = { ...output.away, ...away };
//       }
//       if (incident.text === "HT") {
//         output.halfTimeScore = {
//           homeScore: incident.homeScore,
//           awayScore: incident.awayScore,
//         };
//       }
//     }

//     // Goals & Assists
//     if (incident.incidentType === "goal") {
//       const side = incident.isHome ? "home" : "away";
//       output[side].incidents.goal.push({
//         id: incident.player?.id ?? null,
//         name: incident.player?.name ?? "",
//         incidentClass: incident.incidentClass,
//         time: incident.time,
//         footballPassingNetworkAction: incident.footballPassingNetworkAction,
//       });

//       if (incident.assist1) {
//         output[side].incidents.assist.push({
//           id: incident.assist1.id,
//           name: incident.assist1.name,
//         });
//       } else if (Array.isArray(incident.footballPassingNetworkAction)) {
//         for (const action of incident.footballPassingNetworkAction) {
//           if (action.isAssist && action.player) {
//             output[side].incidents.assist.push({
//               id: action.player.id,
//               name: action.player.name,
//             });
//           }
//         }
//       }
//     }

//     // Cards
//     if (incident.incidentType === "card" && incident.player) {
//       const side = incident.isHome ? "home" : "away";
//       output[side].incidents.card.push({
//         id: incident.player.id,
//         name: incident.player.name,
//         time: incident.time,
//         incidentType: incident.incidentType,
//         incidentClass: incident.incidentClass,
//         reason: incident.reason,
//       });
//     }

//     // Injuries (substitution flagged as injury)
//     if (
//       incident.incidentType === "substitution" &&
//       incident.incidentClass === "injury" &&
//       incident.playerOut
//     ) {
//       const side = incident.isHome ? "home" : "away";
//       output[side].incidents.substitutions.push({
//         playerInId: incident.playerIn?.id ?? null,
//         playerOutId: incident.playerOut?.id ?? null,
//         incidentClass: incident.incidentClass ?? "regular",
//         time: incident.time,
//       });
//     }

//     // Penalties
//     if (incident.incidentType === "inGamePenalty") {
//       const side = incident.isHome ? "home" : "away";
//       const opp = incident.isHome ? "away" : "home";

//       output[side].incidents.penalty.push({
//         id: incident.player?.id,
//         name: incident.player?.name,
//         time: incident.time,
//         incidentClass: incident.incidentClass,
//         incidentType: incident.incidentType,
//         description: incident.description ?? "",
//         reason: incident.reason ?? "",
//       });

//       // mark GK on the other side
//       output[opp].incidents.penalty.push({
//         time: incident.time,
//         incidentClass: incident.incidentClass,
//         incidentType: incident.incidentType,
//         description: incident.description ?? "",
//         reason: incident.reason ?? "",
//         GK: true,
//       });
//     }

//     // Substitutions
//     if (incident.incidentType === "substitution") {
//       const side = incident.isHome ? "home" : "away";

//       output[side].incidents.substitutions.push({
//         playerInId: incident.playerIn?.id ?? null,
//         playerOutId: incident.playerOut?.id ?? null,
//         incidentClass: incident.incidentClass ?? "regular",
//         time: incident.time,
//       });
//     }

//     // Collect metadata into metaMap
//     if (incident.incidentType) {
//       if (!metaMap[incident.incidentType]) {
//         metaMap[incident.incidentType] = new Set();
//       }
//       if (incident.incidentClass != null) {
//         metaMap[incident.incidentType].add(incident.incidentClass);
//       }
//     }
//   }

//   // flatten metaData sets
//   for (const type in metaMap) {
//     output.metadata[type] = Array.from(metaMap[type]);
//   }

//   return output;
// }

// export function transformShotmap(data: any): TransformedShotmap {
//   // accumulate unique values in Sets
//   const shotTypes = new Set<string>();
//   const situations = new Set<string>();
//   const bodyParts = new Set<string>();

//   // the two result arrays
//   const home: TransformedShotmap["home"] = [];
//   const away: TransformedShotmap["away"] = [];

//   data.shotmap.forEach((shot: any) => {
//     const sideArr = shot.isHome ? home : away;

//     const entry = {
//       id: shot.player?.id ?? null,
//       name: shot.player?.name ?? "",
//       shotType: shot.shotType,
//       situation: shot.situation ?? "",
//       bodyPart: shot.bodyPart ?? "",
//       xg: shot.xg ?? 0,
//       xgot: shot.xgot ?? 0,
//       time: shot.time,
//       coordinates: {
//         player: shot.playerCoordinates ?? {},
//         goalMouth: shot.goalMouthCoordinates ?? {},
//         block: shot.blockCoordinates ?? null,
//       },
//       draw: shot.draw ?? {},
//     };

//     sideArr.push(entry);

//     // collect for metadata
//     if (shot.shotType) shotTypes.add(shot.shotType);
//     if (shot.situation) situations.add(shot.situation);
//     if (shot.bodyPart) bodyParts.add(shot.bodyPart);
//   });

//   return {
//     home,
//     away,
//     metaData: {
//       shotTypes: Array.from(shotTypes),
//       situations: Array.from(situations),
//       bodyParts: Array.from(bodyParts),
//     },
//   };
// }

// export function transformAvgPosition(data: any): TransformedAvgPosition {
//   const simplify = (teamArray: any[]): AvgPositionEntry[] => {
//     return teamArray.map((entry) => ({
//       id: entry.player.id,
//       name: entry.player.name,
//       averageX: entry.averageX,
//       averageY: entry.averageY,
//       pointsCount: entry.pointsCount,
//     }));
//   };

//   return {
//     home: simplify(data.home || []),
//     away: simplify(data.away || []),
//   };
// }

// export function extractPlayerBasicInfo(lineups: {
//   home: { players: PlayerBasicInfo[] };
//   away: { players: PlayerBasicInfo[] };
// }): ExtractedPlayerBasicInfo {
//   const simplify = (teamPlayers: PlayerBasicInfo[] = []): PlayerBasicInfo[] =>
//     teamPlayers.map(({ id, name, slug }) => ({ id, name, slug }));

//   return {
//     home: simplify(lineups.home?.players),
//     away: simplify(lineups.away?.players),
//   };
// }

// function extractScenarioContext(data: any) {
//   const sortedIncidents = [...data.incident.incidents].sort(
//     (a, b) => a.time - b.time
//   );

//   const goals = sortedIncidents.filter((i) => i.incidentType === "goal");
//   const firstGoal = goals[0];
//   const firstGoalTime = firstGoal?.time || null;
//   const firstTeamScored = firstGoal?.isHome ? "home" : "away";

//   const homeGoals = data.home.incident.goalFor;
//   const awayGoals = data.away.incident.goalFor;

//   const firstHalfHomeGoals = data.incidentsPeriod.halfTimeScore.homeScore;
//   const firstHalfAwayGoals = data.incidentsPeriod.halfTimeScore.awayScore;

//   const secondHalfHomeGoals = homeGoals - firstHalfHomeGoals;
//   const secondHalfAwayGoals = awayGoals - firstHalfAwayGoals;

//   return {
//     firstTeamScored,
//     firstGoalTime,
//     homeGoals,
//     awayGoals,
//     firstHalfHomeGoals,
//     firstHalfAwayGoals,
//     secondHalfHomeGoals,
//     secondHalfAwayGoals,
//   };
// }

// export function mergePlayerData(
//   lineObj: TransformedLineups,
//   shotmapObj: TransformedShotmap,
//   avgPositionObj: TransformedAvgPosition,
//   heatmapsObj: PlayerHeatmap[]
// ): void {
//   const addDataToStatsPlayers = (
//     team: TransformedLineups["home"] | TransformedLineups["away"],
//     side: "home" | "away"
//   ) => {
//     team.statisticsPlayer = team.statisticsPlayer.map((player) => {
//       const id = player.id;

//       // all shots for this player
//       const playerShots = (shotmapObj[side] || []).filter((s) => s.id === id);

//       // this player’s avg position (or null)
//       const avgPos =
//         (avgPositionObj[side] || []).find((p) => p.id === id) ?? null;

//       // raw heatmap payload for this player (or null)
//       const heatmapOnly = heatmapsObj.find((h) => h.id === id)?.heatmap ?? null;

//       return {
//         ...player,
//         shots: playerShots,
//         averagePosition: avgPos,
//         heatmap: heatmapOnly,
//       };
//     });
//   };

//   if (lineObj.home) addDataToStatsPlayers(lineObj.home, "home");
//   if (lineObj.away) addDataToStatsPlayers(lineObj.away, "away");
// }

// export async function heatmapPlayer(
//   matchId: number,
//   players: ExtractedPlayerBasicInfo
// ): Promise<PlayerHeatmap[]> {
//   const allPlayers = [...players.home, ...players.away];

//   const heatmapPromises = allPlayers.map(async (player) => {
//     const url = `https://www.sofascore.com/api/v1/event/${matchId}/player/${player.id}/heatmap`;

//     try {
//       const response = await axios.get<unknown>(url);
//       return {
//         ...player,
//         heatmap: response.data,
//       } as PlayerHeatmap;
//     } catch (err: any) {
//       if (err.response?.status === 404) {
//         console.warn(`⚠️ No heatmap for ${player.name} (${player.id})`);
//       } else {
//         console.error(
//           `❌ Error fetching heatmap for ${player.name}:`,
//           err.message
//         );
//       }
//       return null;
//     }
//   });

//   const results = await Promise.all(heatmapPromises);
//   return results.filter((entry): entry is PlayerHeatmap => entry !== null);
// }

// export function evaluateScenarios(data: any) {
//   const context = extractScenarioContext(data);
//   const scenarios = getScenarioList();

//   const homeMatchScenario = [];
//   const awayMatchScenario = [];

//   for (const scenario of scenarios) {
//     try {
//       const fn = new Function(
//         ...Object.keys(context),
//         `return ${scenario.script}`
//       );
//       const isMatch = fn(...Object.values(context));

//       if (isMatch) {
//         if (scenario.team === "home" || scenario.team === "both") {
//           homeMatchScenario.push(Number(scenario.id));
//         }
//         if (scenario.team === "away" || scenario.team === "both") {
//           awayMatchScenario.push(Number(scenario.id));
//         }
//       }
//     } catch (e) {
//       console.warn("❌ Error evaluating scenario:", scenario.name);
//     }
//   }

//   return {
//     home: { matchScenario: homeMatchScenario.sort((a, b) => a - b) },
//     away: { matchScenario: awayMatchScenario.sort((a, b) => a - b) },
//   };
// }

// // // // //

// export function transformMatchResult(
//   matchId: number,
//   incidetns: any,
//   lineups: any
// ): MatchResultRow {
//   return {
//     match_cust_id: matchId,
//     home_score_ft: incidetns.fullTimeScore?.homeScore,
//     home_score_ht: incidetns.halfTimeScore?.homeScore,
//     home_formation: lineups.home?.formation,
//     home_result: incidetns.home?.result,
//     away_score_ft: incidetns.fullTimeScore?.awayScore,
//     away_score_ht: incidetns.halfTimeScore?.awayScore,
//     away_formation: lineups.away?.formation,
//     away_result: incidetns.away?.result,
//   };
// }

// export function transformMatchScenarios(
//   matchId: number,
//   homeTeamId: number,
//   awayTeamId: number,
//   evaluation: ReturnType<typeof evaluateScenarios>
// ): {
//   match_cust_id: number;
//   team_cust_id: number;
//   team_side: "home" | "away";
//   scenario_id: number;
// }[] {
//   const home = evaluation.home.matchScenario.map((scenario_id) => ({
//     match_cust_id: matchId,
//     team_cust_id: homeTeamId,
//     team_side: "home" as const,
//     scenario_id,
//   }));

//   const away = evaluation.away.matchScenario.map((scenario_id) => ({
//     match_cust_id: matchId,
//     team_cust_id: awayTeamId,
//     team_side: "away" as const,
//     scenario_id,
//   }));

//   return [...home, ...away];
// }

// export function transformMatchStats(
//   matchId: number,
//   homeTeamId: number,
//   awayTeamId: number,
//   stats: TransformedStatistics
// ): {
//   match_cust_id: number;
//   team_cust_id: number;
//   team_side: "home" | "away";
//   stat_key: string;
//   phase: string;
//   value: number | null;
//   display: string | null;
//   total: number | null;
// }[] {
//   const rows: any[] = [];

//   for (const phase of Object.keys(stats.home)) {
//     const homeStats = stats.home[phase];
//     const awayStats = stats.away[phase];

//     for (const key of Object.keys(homeStats)) {
//       const h = homeStats[key];
//       rows.push({
//         match_cust_id: matchId,
//         team_cust_id: homeTeamId,
//         team_side: "home",
//         stat_key: key,
//         phase,
//         value: h.value ?? null,
//         display: h.display ?? null,
//         total: h.total ?? null,
//       });
//     }

//     for (const key of Object.keys(awayStats)) {
//       const a = awayStats[key];
//       rows.push({
//         match_cust_id: matchId,
//         team_cust_id: awayTeamId,
//         team_side: "away",
//         stat_key: key,
//         phase,
//         value: a.value ?? null,
//         display: a.display ?? null,
//         total: a.total ?? null,
//       });
//     }
//   }

//   return rows;
// }

// export function transformMatchPlayerInfo(
//   matchId: number,
//   lineups: TransformedLineups,
//   incidents: TransformedIncidents
// ) {
//   const rows: {
//     match_cust_id: number;
//     player_cust_id: number;
//     minutes_played: number | null;
//     starter: boolean;
//     substitute: boolean;
//     substitute_class: string | null;
//     rating: number | null;
//   }[] = [];

//   const processTeam = (team: typeof lineups.home, side: "home" | "away") => {
//     const substitutions = incidents[side].incidents.substitutions;

//     const subInMap = new Map(
//       substitutions
//         .filter((s) => s.playerInId !== null)
//         .map((s) => [s.playerInId!, s])
//     );

//     const subOutMap = new Map(
//       substitutions
//         .filter((s) => s.playerOutId !== null)
//         .map((s) => [s.playerOutId!, s])
//     );

//     for (const player of team.statisticsPlayer) {
//       // if (player.id === 830659) console.log("player", player);

//       const playerId = player.id;

//       const rating = player.statistics.rating
//         ? Number(player.statistics.rating)
//         : null;

//       const subIn = subInMap.get(playerId) ?? null;
//       const subOut = subOutMap.get(playerId) ?? null;

//       const subClass: string | null =
//         subIn?.incidentClass ?? subOut?.incidentClass ?? null;

//       const calculateMinutesPlayed = (): number | null => {
//         if (subIn && subOut) {
//           return subOut.time - subIn.time;
//         } else if (subOut) {
//           return subOut.time;
//         } else if (subIn) {
//           return 90 - subIn.time;
//         } else if (rating !== null) {
//           return 90;
//         } else {
//           return 0;
//         }
//       };

//       const minutesPlayed = calculateMinutesPlayed();
//       // Determine role based on presence in substitution data
//       const starter = subOut !== null || (!subIn && rating !== null);
//       const substitute = subIn !== null || subOut !== null;

//       // if (playerId === 796986) console.log("player", player);
//       if (playerId === 830659) {
//         console.log("PLAYER 830659:", {
//           subIn,
//           subOut,
//           starter,
//           substitute,
//           minutesPlayed,
//           rating,
//           subClass,
//         });
//       }

//       rows.push({
//         match_cust_id: matchId,
//         player_cust_id: playerId,
//         minutes_played: minutesPlayed,
//         starter,
//         substitute,
//         substitute_class: subClass,
//         rating,
//       });
//     }
//   };

//   processTeam(lineups.home, "home");
//   processTeam(lineups.away, "away");

//   return rows;
// }

// export function transformMatchPlayerStats(
//   matchId: number,
//   lineups: TransformedLineups
// ) {
//   const rows: {
//     match_cust_id: number;
//     player_cust_id: number;
//     stat_key: string;
//     stat_value: number | null;
//   }[] = [];

//   const processTeam = (team: typeof lineups.home) => {
//     for (const player of team.statisticsPlayer) {
//       const playerId = player.id;

//       for (const [statKey, value] of Object.entries(player.statistics)) {
//         if (value === null || value === undefined) continue;

//         const statValue =
//           typeof value === "object" && value !== null && "value" in value
//             ? Number((value as { value: number }).value)
//             : Number(value);

//         rows.push({
//           match_cust_id: matchId,
//           player_cust_id: playerId,
//           stat_key: statKey,
//           stat_value: isNaN(statValue) ? null : statValue,
//         });
//       }
//     }
//   };

//   processTeam(lineups.home);
//   processTeam(lineups.away);

//   return rows;
// }

// export interface MatchPlayerShotRow {
//   shot_id: number;
//   match_cust_id: number;
//   player_cust_id: number;
//   time: number | null;
//   shot_type: string | null;
//   situation: string | null;
//   body_part: string | null;
//   xg: number | null;
//   xgot: number | null;
//   details_json: any;
// }

// export function transformMatchPlayerShots(
//   matchId: number,
//   shotmap: { home: any[]; away: any[] }
// ): MatchPlayerShotRow[] {
//   const processSide = (shots: any[]): MatchPlayerShotRow[] =>
//     shots.map((shot) => ({
//       shot_id: shot.id,
//       match_cust_id: matchId,
//       player_cust_id: shot.id, // Replace with actual player ID if available (e.g., shot.playerId)
//       time: shot.time ?? null,
//       shot_type: shot.shotType ?? null,
//       situation: shot.situation ?? null,
//       body_part: shot.bodyPart ?? null,
//       xg: shot.xg ?? null,
//       xgot: shot.xgot ?? null,
//       details_json: shot, // Keep entire shot for flexibility
//     }));

//   return [...processSide(shotmap.home), ...processSide(shotmap.away)];
// }

// export function transformMatchPlayerHeatmap(
//   matchId: number,
//   heatmapData: { id: number; heatmap: { x: number; y: number }[] }[]
// ) {
//   return heatmapData.map((player) => ({
//     match_cust_id: matchId,
//     player_cust_id: player.id,
//     heatmap: player.heatmap, // already an array of { x, y }
//   }));
// }

// let globalIncidentId = 1;

// export function transformMatchIncidents(
//   matchId: number,
//   incidents: TransformedIncidents
// ) {
//   const rows: {
//     id: number;
//     incident_cust_id: number | null;
//     match_cust_id: number;
//     incident_type: string;
//     incident_class: string | null;
//     team_side: "home" | "away";
//     time: number | null;
//     period: number | null;
//     player_id: number | null;
//     assist_id: number | null;
//     player_in_id: number | null;
//     player_out_id: number | null;
//     home_score: number | null;
//     away_score: number | null;
//     goal_type: string | null;
//     body_part: string | null;
//     goalkeeper_id: number | null;
//     details_json: any | null;
//   }[] = [];

//   const handleSide = (side: "home" | "away") => {
//     const data = incidents[side].incidents;

//     // GOALS
//     for (const goal of data.goal) {
//       const fpn = (goal.footballPassingNetworkAction as any[])?.[0];

//       rows.push({
//         id: globalIncidentId++,
//         incident_cust_id: goal.id ?? null,
//         match_cust_id: matchId,
//         incident_type: "goal",
//         incident_class: goal.incidentClass ?? null,
//         team_side: side,
//         time: goal.time != null ? Number(goal.time) : null,
//         period: null,
//         player_id: goal.id ?? null,
//         assist_id: null,
//         player_in_id: null,
//         player_out_id: null,
//         home_score: null,
//         away_score: null,
//         goal_type: fpn?.goalType ?? null,
//         body_part: fpn?.bodyPart ?? null,
//         goalkeeper_id: fpn?.goalkeeper?.id ?? null,
//         details_json: goal.footballPassingNetworkAction ?? null,
//       });
//     }

//     // CARDS
//     for (const card of data.card) {
//       rows.push({
//         id: globalIncidentId++,
//         incident_cust_id: card.id ?? null,
//         match_cust_id: matchId,
//         incident_type: "card",
//         incident_class: card.incidentClass ?? null,
//         team_side: side,
//         time: card.time != null ? Number(card.time) : null,
//         period: null,
//         player_id: card.id ?? null,
//         assist_id: null,
//         player_in_id: null,
//         player_out_id: null,
//         home_score: null,
//         away_score: null,
//         goal_type: null,
//         body_part: null,
//         goalkeeper_id: null,
//         details_json: card.reason ? { reason: card.reason } : null,
//       });
//     }

//     // SUBSTITUTIONS (with deduplication)
//     const seenSubs = new Set<string>();
//     for (const sub of data.substitutions) {
//       const key = `${sub.playerInId}-${sub.playerOutId}-${sub.time}`;
//       if (seenSubs.has(key)) continue;
//       seenSubs.add(key);

//       rows.push({
//         id: globalIncidentId++,
//         incident_cust_id: null,
//         match_cust_id: matchId,
//         incident_type: "substitution",
//         incident_class: sub.incidentClass ?? null,
//         team_side: side,
//         time: sub.time != null ? Number(sub.time) : null,
//         period: null,
//         player_id: null,
//         assist_id: null,
//         player_in_id: sub.playerInId ?? null,
//         player_out_id: sub.playerOutId ?? null,
//         home_score: null,
//         away_score: null,
//         goal_type: null,
//         body_part: null,
//         goalkeeper_id: null,
//         details_json: null,
//       });
//     }

//     // PENALTIES
//     for (const pen of data.penalty) {
//       rows.push({
//         id: globalIncidentId++,
//         incident_cust_id: pen.id ?? null,
//         match_cust_id: matchId,
//         incident_type: "penalty",
//         incident_class: pen.incidentClass ?? null,
//         team_side: side,
//         time: pen.time != null ? Number(pen.time) : null,
//         period: null,
//         player_id: pen.id ?? null,
//         assist_id: null,
//         player_in_id: null,
//         player_out_id: null,
//         home_score: null,
//         away_score: null,
//         goal_type: null,
//         body_part: null,
//         goalkeeper_id: pen.GK ? -1 : null,
//         details_json: {
//           description: pen.description ?? null,
//           reason: pen.reason ?? null,
//           GK: pen.GK ?? false,
//         },
//       });
//     }
//   };

//   handleSide("home");
//   handleSide("away");

//   return rows;
// }

// // // // //

// export interface MatchDayData {
//   players: any[];
//   metadata_statistics: any[];
//   match_result: any[];
//   match_result_scenarios: any[];
//   match_stats: any[];
//   match_incident: any[];
//   match_player_info: any[];
//   match_player_stats: any[];
//   match_player_shot: any[];
//   match_player_heatmap: any[];
// }
// export async function getMatchDayData(
//   url: string
// ): Promise<MatchDayData | null> {
//   console.log("getMatchDayData url", url);
//   const { id: matchId } = extractSofaIdsMatchDay(url);
//   console.log("getMatchDayData id", matchId);

//   if (!matchId) {
//     console.error("❌ Invalid URL – missing matchday");
//     return null;
//   }
//   // https://www.sofascore.com/football/match/bournemouth-leicester-city/Gskb#id:12436536
//   const apiUrl = `https://www.sofascore.com/api/v1/event/${matchId}`;
//   console.log("apiURL", apiUrl);

//   /*--- fetch the data ---*/
//   const responseGeneral = await axios.get(`${apiUrl}`);
//   const responseStatistics = await axios.get(`${apiUrl}/statistics`);
//   const responseLineups = await axios.get(`${apiUrl}/lineups`);
//   const responseIncidents = await axios.get(`${apiUrl}/incidents`);
//   const responseShotmap = await axios.get(`${apiUrl}/shotmap`);
//   const responseAvgPosition = await axios.get(`${apiUrl}/average-positions`);

//   /*--- transform the data ---*/
//   const general = responseGeneral.data.event;
//   const statistic = transformStatistics(responseStatistics.data.statistics);
//   const lineups = transformLineups(responseLineups.data);
//   const incidetns = transformIncident(responseIncidents.data);
//   const shotmap = transformShotmap(responseShotmap.data);
//   const avgPosition = transformAvgPosition(responseAvgPosition.data);

//   const players = extractPlayerBasicInfo(lineups);
//   const heatmap = await heatmapPlayer(matchId, players);

//   mergePlayerData(lineups, shotmap, avgPosition, heatmap);

//   console.log("general", general.homeTeam?.id);
//   console.log("incidetns", incidetns);

//   const evaluation = evaluateScenarios({
//     metadata: {
//       statistics: statistic.metadata,
//       lineups: lineups.metadata,
//       incident: incidetns.metadata,
//       shotmap: shotmap.metaData,
//     },
//     incidentsPeriod: {
//       fullTimeScore: incidetns.fullTimeScore,
//       halfTimeScore: incidetns.halfTimeScore,
//     },
//     home: { incident: incidetns.home },
//     away: { incident: incidetns.away },
//     incident: { incidents: responseIncidents.data.incidents },
//   });

//   // const obj = {
//   //   metadata_statistics: statistic.metadata,
//   //   match_result: {
//   //     home: {
//   //       formation: lineups.home.formation,
//   //       players: lineups.home.players,
//   //     },
//   //     away: {
//   //       formation: lineups.away.formation,
//   //       players: lineups.away.players,
//   //     },
//   //   },
//   //   match_result_scenarios: evaluateScenarios({
//   //     metadata: {
//   //       statistics: statistic.metadata,
//   //       lineups: lineups.metadata,
//   //       incident: incidetns.metadata,
//   //       shotmap: shotmap.metaData,
//   //     },
//   //     incidentsPeriod: {
//   //       fullTimeScore: incidetns.fullTimeScore,
//   //       halfTimeScore: incidetns.halfTimeScore,
//   //     },
//   //     home: { incident: incidetns.home },
//   //     away: { incident: incidetns.away },
//   //   }),
//   //   match_stats: {
//   //     home: statistic.home,
//   //     away: statistic.away,
//   //   },
//   //   match_incidents: responseIncidents.data,
//   //   match_player_info: players,
//   //   match_player_stats: {
//   //     home: lineups.home.statisticsPlayer,
//   //     away: lineups.away.statisticsPlayer,
//   //   },
//   //   match_player_shot: shotmap,
//   //   match_player_heatmap: heatmap,
//   // };

//   // console.log("obj", obj);

//   const match_result: any = transformMatchResult(matchId, incidetns, lineups);
//   const match_result_scenarios = transformMatchScenarios(
//     matchId,
//     general.homeTeam?.id,
//     general.awayTeam?.id,
//     evaluation
//   );

//   const match_stats = transformMatchStats(
//     matchId,
//     general.homeTeam?.id,
//     general.awayTeam?.id,
//     statistic
//   );

//   const match_player_info = transformMatchPlayerInfo(
//     matchId,
//     lineups,
//     incidetns
//   );
//   const match_player_stats = transformMatchPlayerStats(matchId, lineups);

//   const match_player_shot = transformMatchPlayerShots(matchId, shotmap);

//   const match_player_heatmap = transformMatchPlayerHeatmap(
//     matchId,
//     heatmap.map((p) => ({
//       id: p.id,
//       heatmap: p.heatmap.heatmap, // unwrapped
//     }))
//   );

//   const match_incidents = transformMatchIncidents(matchId, incidetns);

//   console.log("match_incidents", match_incidents);

//   return {
//     players: lineups.players,
//     metadata_statistics: statistic.metadata,
//     match_result: match_result,
//     match_result_scenarios: match_result_scenarios,
//     match_stats: match_stats,
//     match_incident: match_incidents,
//     match_player_info: match_player_info,
//     match_player_stats: match_player_stats,
//     match_player_shot: match_player_shot,
//     match_player_heatmap: match_player_heatmap,
//   };
// }


// https://www.sofascore.com/football/match/bournemouth-leicester-city/Gskb#id:12436536
export async function getMatchDayData(
  url: string
): Promise<MatchDayData | null> {
  try {
    const service = new MatchDayService(url);
    return await service.getMatchDayData();
  } catch (err) {
    console.error("❌ Failed to get match day data:", err);
    return null;
  }
}

// export type { MatchDayData };
