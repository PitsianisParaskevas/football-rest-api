import axios from "axios";
import {
  evaluateScenarios,
  extractPlayerBasicInfo,
  extractSofaIds,
  heatmapPlayer,
  mergePlayerData,
  transformAvgPosition,
  transformIncident,
  transformLineups,
  transformShotmap,
  transformStatistics,
} from "./functions";
import type { MatchResult } from "@/types/matchResult.type";
// import { TransformedStatistics } from "@/types/results.types";

export async function runResultsFetch(url: string) {
  const ids = extractSofaIds(url);

  if (!ids.id) {
    console.error("❌ Invalid Sofa URL. Couldn't extract IDs.");
    return;
  }

  const matchId = ids.id;
  const apiUrl = `https://www.sofascore.com/api/v1/event/${matchId}`;

  /*--- fetch the data ---*/
  const responseStatistics = await axios.get(`${apiUrl}/statistics`);
  const responseLineups = await axios.get(`${apiUrl}/lineups`);
  const responseIncidents = await axios.get(`${apiUrl}/incidents`);
  const responseShotmap = await axios.get(`${apiUrl}/shotmap`);
  const responseAvgPosition = await axios.get(`${apiUrl}/average-positions`);

  // console.log("res", responseAvgPosition.data);

  /*--- transform the data ---*/
  const statistic = transformStatistics(responseStatistics.data.statistics);
  const lineups = transformLineups(responseLineups.data);
  const incidetns = transformIncident(responseIncidents.data);
  const shotmap = transformShotmap(responseShotmap.data);
  const avgPosition = transformAvgPosition(responseAvgPosition.data);

  const players = extractPlayerBasicInfo(lineups);
  const heatmap = await heatmapPlayer(matchId, players);

  mergePlayerData(lineups, shotmap, avgPosition, heatmap);

  const finalObject: MatchResult = {
    metadata: {
      statistics: statistic.metadata,
      lineups: lineups.metadata,
      incident: incidetns.metadata,
      shotmap: shotmap.metaData,
    },
    incidentsPeriod: {
      fullTimeScore: incidetns.fullTimeScore,
      halfTimeScore: incidetns.halfTimeScore,
    },
    home: {
      stats: statistic.home,
      formation: lineups.home.formation,
      incident: {
        points: incidetns.home.points,
        result: incidetns.home.result,
        goalFor: incidetns.home.goalFor,
        goalAgainst: incidetns.home.goalAgainst,
      },
      players: lineups.home.players,
      statisticsPlayer: lineups.home.statisticsPlayer,
      scenario: [],
    },
    away: {
      stats: statistic.away,
      formation: lineups.away.formation,
      incident: {
        points: incidetns.away.points,
        result: incidetns.away.result,
        goalFor: incidetns.away.goalFor,
        goalAgainst: incidetns.away.goalAgainst,
      },
      players: lineups.away.players,
      statisticsPlayer: lineups.away.statisticsPlayer,
      scenario: [],
    },
    incident: responseIncidents.data,
  };

  // Evaluate scenario scripts and assign
  const scenarioResult = evaluateScenarios(finalObject);
  finalObject.home.scenario = scenarioResult.home.matchScenario;
  finalObject.away.scenario = scenarioResult.away.matchScenario;

  return finalObject;
}
