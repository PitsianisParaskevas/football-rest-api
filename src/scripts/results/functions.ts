// src/utils/functions.ts
import axios from "axios";

import type { TransformedStatistics } from "@/types/results.type";
import type { TransformedLineups } from "@/types/lineup.type";
import type { TransformedIncidents } from "@/types/incidetns.type";
import type { TransformedShotmap } from "@/types/shotmap.type";
import type {
  AvgPositionEntry,
  TransformedAvgPosition,
} from "@/types/avgPosition.type";
import type {
  ExtractedPlayerBasicInfo,
  PlayerBasicInfo,
  PlayerHeatmap,
} from "@/types/basicPlayerInfo.type";
import { getScenarioList } from "@/utils/scenario.utils";

/**
 * Helper functions
 */
function findResult(home: number, away: number) {
  const result = {
    home: { points: 0, result: "", goalFor: home, goalAgainst: away },
    away: { points: 0, result: "", goalFor: away, goalAgainst: home },
  };

  if (home > away) {
    result.home.points = 3;
    result.home.result = "win";
    result.away.points = 0;
    result.away.result = "lose";
  } else if (home === away) {
    result.home.points = 1;
    result.home.result = "draw";
    result.away.points = 1;
    result.away.result = "draw";
  } else {
    result.home.points = 0;
    result.home.result = "lose";
    result.away.points = 3;
    result.away.result = "win";
  }

  return result;
}

export function extractSofaIds(sofaURL: string): { id: number | null } {
  const idMatch = sofaURL.match(/id:(\d+)/);
  return { id: idMatch ? parseInt(idMatch[1], 10) : null };
}

export function extractPlayerBasicInfo(lineups: {
  home: { players: PlayerBasicInfo[] };
  away: { players: PlayerBasicInfo[] };
}): ExtractedPlayerBasicInfo {
  const simplify = (teamPlayers: PlayerBasicInfo[] = []): PlayerBasicInfo[] =>
    teamPlayers.map(({ id, name, slug }) => ({ id, name, slug }));

  return {
    home: simplify(lineups.home?.players),
    away: simplify(lineups.away?.players),
  };
}

function extractScenarioContext(data: any) {
  const sortedIncidents = [...data.incident.incidents].sort(
    (a, b) => a.time - b.time
  );

  const goals = sortedIncidents.filter((i) => i.incidentType === "goal");
  const firstGoal = goals[0];
  const firstGoalTime = firstGoal?.time || null;
  const firstTeamScored = firstGoal?.isHome ? "home" : "away";

  const homeGoals = data.home.incident.goalFor;
  const awayGoals = data.away.incident.goalFor;

  const firstHalfHomeGoals = data.incidentsPeriod.halfTimeScore.homeScore;
  const firstHalfAwayGoals = data.incidentsPeriod.halfTimeScore.awayScore;

  const secondHalfHomeGoals = homeGoals - firstHalfHomeGoals;
  const secondHalfAwayGoals = awayGoals - firstHalfAwayGoals;

  return {
    firstTeamScored,
    firstGoalTime,
    homeGoals,
    awayGoals,
    firstHalfHomeGoals,
    firstHalfAwayGoals,
    secondHalfHomeGoals,
    secondHalfAwayGoals,
  };
}

export function mergePlayerData(
  lineObj: TransformedLineups,
  shotmapObj: TransformedShotmap,
  avgPositionObj: TransformedAvgPosition,
  heatmapsObj: PlayerHeatmap[]
): void {
  const addDataToStatsPlayers = (
    team: TransformedLineups["home"] | TransformedLineups["away"],
    side: "home" | "away"
  ) => {
    team.statisticsPlayer = team.statisticsPlayer.map((player) => {
      const id = player.id;

      // all shots for this player
      const playerShots = (shotmapObj[side] || []).filter((s) => s.id === id);

      // this player’s avg position (or null)
      const avgPos =
        (avgPositionObj[side] || []).find((p) => p.id === id) ?? null;

      // raw heatmap payload for this player (or null)
      const heatmapOnly = heatmapsObj.find((h) => h.id === id)?.heatmap ?? null;

      return {
        ...player,
        shots: playerShots,
        averagePosition: avgPos,
        heatmap: heatmapOnly,
      };
    });
  };

  if (lineObj.home) addDataToStatsPlayers(lineObj.home, "home");
  if (lineObj.away) addDataToStatsPlayers(lineObj.away, "away");
}

/**
 *
 * ------------ TRANSFORM FUNCTIONS ------------*
 *
 */
export function transformStatistics(data: any): TransformedStatistics {
  const output: TransformedStatistics = {
    metadata: {},
    home: {},
    away: {},
  };

  // assume data is the array of periods
  data.forEach((periodData: any) => {
    const period = periodData.period;
    output.home[period] = {};
    output.away[period] = {};

    periodData.groups.forEach((group: any) => {
      const groupName = group.groupName;
      group.statisticsItems.forEach((item: any) => {
        const key = item.key || item.name;
        if (!output.metadata[key]) {
          output.metadata[key] = {
            group: groupName,
            name: item.name,
            key,
          };
        }
        output.home[period][key] = {
          value: item.homeValue,
          display: item.home,
          ...(item.homeTotal !== undefined && { total: item.homeTotal }),
        };
        output.away[period][key] = {
          value: item.awayValue,
          display: item.away,
          ...(item.awayTotal !== undefined && { total: item.awayTotal }),
        };
      });
    });
  });

  return output;
}

export function transformLineups(data: any): TransformedLineups {
  const statisticsKeys = new Set<string>();

  function processTeam(team: any): TransformedLineups["home"] {
    const players: TransformedLineups["home"]["players"] = [];
    const statisticsPlayer: TransformedLineups["home"]["statisticsPlayer"] = [];
    const missingPlayers: TransformedLineups["home"]["missingPlayers"] = [];

    // map main squad
    team.players.forEach((item: any) => {
      const p = item.player;
      players.push({
        id: p.id,
        name: p.name,
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        slug: p.slug,
        shortName: p.shortName,
        position: item.position,
        jerseyNumber: item.jerseyNumber,
        height: p.height,
        userCount: p.userCount,
        country: p.country,
        marketValueCurrency: p.marketValueCurrency,
        dateOfBirthTimestamp: p.dateOfBirthTimestamp,
        proposedMarketValueRaw: p.proposedMarketValueRaw,
        teamId: item.teamId,
        shirtNumber: item.jerseyNumber ? Number(item.jerseyNumber) : "",
      });

      const stats = item.statistics || {};
      Object.keys(stats).forEach((k) => statisticsKeys.add(k));
      statisticsPlayer.push({
        id: p.id,
        name: p.name,
        userCount: p.userCount,
        proposedMarketValueRaw: p.proposedMarketValueRaw,
        substitute:
          item.substitute && Object.keys(stats).length === 0
            ? "noSubstitute"
            : item.substitute,
        statistics: stats as Record<string, number>,
      });
    });

    // missing/doubtful
    (team.missingPlayers || []).forEach((m: any) => {
      const p = m.player;
      missingPlayers.push({
        id: p.id,
        name: p.name,
        userCount: p.userCount,
        type: m.type,
        reason: m.reason,
      });
      // also add to full roster
      players.push({
        id: p.id,
        name: p.name,
        firstName: p.firstName ?? "",
        lastName: p.lastName ?? "",
        slug: p.slug,
        shortName: p.shortName,
        position: p.position,
        jerseyNumber: p.jerseyNumber,
        height: p.height,
        userCount: p.userCount,
        country: p.country,
        marketValueCurrency: p.marketValueCurrency,
        dateOfBirthTimestamp: p.dateOfBirthTimestamp,
        proposedMarketValueRaw: p.proposedMarketValueRaw,
        teamId: null,
        shirtNumber: "",
      });
    });

    // pick best by rating
    let best: {
      id: number;
      name: string;
      userCount: number;
      rating: number;
    } | null = null;

    for (const sp of statisticsPlayer) {
      // coerce whatever comes back into a real number
      const rating = Number(sp.statistics.rating) || 0;

      if (!best || rating > best.rating) {
        best = { id: sp.id, name: sp.name, userCount: sp.userCount, rating };
      }
    }

    return {
      formation: team.formation,
      players,
      statisticsPlayer,
      missingPlayers,
      bestPlayer: best,
    };
  }

  return {
    metadata: { statisticsKeys: Array.from(statisticsKeys) },
    home: processTeam(data.home),
    away: processTeam(data.away),
  };
}

export function transformIncident(data: any): TransformedIncidents {
  const output: TransformedIncidents = {
    metadata: {},
    fullTimeScore: { homeScore: 0, awayScore: 0 },
    halfTimeScore: { homeScore: 0, awayScore: 0 },
    home: {
      points: 0,
      result: "",
      goalFor: 0,
      goalAgainst: 0,
      incidents: {
        goal: [],
        card: [],
        assist: [],
        injury: [],
        penalty: [],
      },
    },
    away: {
      points: 0,
      result: "",
      goalFor: 0,
      goalAgainst: 0,
      incidents: {
        goal: [],
        card: [],
        assist: [],
        injury: [],
        penalty: [],
      },
    },
  };

  // Temporary map of Sets to collect each class per type
  const metaMap: Record<string, Set<string>> = {};

  for (const incident of data.incidents) {
    // Period markers
    if (incident.incidentType === "period") {
      if (incident.text === "FT") {
        output.fullTimeScore = {
          homeScore: incident.homeScore,
          awayScore: incident.awayScore,
        };
        const { home, away } = findResult(
          incident.homeScore,
          incident.awayScore
        );
        output.home = { ...output.home, ...home };
        output.away = { ...output.away, ...away };
      }
      if (incident.text === "HT") {
        output.halfTimeScore = {
          homeScore: incident.homeScore,
          awayScore: incident.awayScore,
        };
      }
    }

    // Goals & Assists
    if (incident.incidentType === "goal") {
      const side = incident.isHome ? "home" : "away";
      output[side].incidents.goal.push({
        id: incident.player?.id ?? null,
        name: incident.player?.name ?? "",
        incidentClass: incident.incidentClass,
        time: incident.time,
        footballPassingNetworkAction: incident.footballPassingNetworkAction,
      });

      if (incident.assist1) {
        output[side].incidents.assist.push({
          id: incident.assist1.id,
          name: incident.assist1.name,
        });
      } else if (Array.isArray(incident.footballPassingNetworkAction)) {
        for (const action of incident.footballPassingNetworkAction) {
          if (action.isAssist && action.player) {
            output[side].incidents.assist.push({
              id: action.player.id,
              name: action.player.name,
            });
          }
        }
      }
    }

    // Cards
    if (incident.incidentType === "card" && incident.player) {
      const side = incident.isHome ? "home" : "away";
      output[side].incidents.card.push({
        id: incident.player.id,
        name: incident.player.name,
        time: incident.time,
        incidentType: incident.incidentType,
        incidentClass: incident.incidentClass,
        reason: incident.reason,
      });
    }

    // Injuries (substitution flagged as injury)
    if (
      incident.incidentType === "substitution" &&
      incident.incidentClass === "injury" &&
      incident.playerOut
    ) {
      const side = incident.isHome ? "home" : "away";
      output[side].incidents.injury.push({
        id: incident.playerOut.id,
        name: incident.playerOut.name,
        time: incident.time,
        incidentClass: incident.incidentClass,
      });
    }

    // Penalties
    if (incident.incidentType === "inGamePenalty") {
      const side = incident.isHome ? "home" : "away";
      const opp = incident.isHome ? "away" : "home";

      output[side].incidents.penalty.push({
        id: incident.player?.id,
        name: incident.player?.name,
        time: incident.time,
        incidentClass: incident.incidentClass,
        incidentType: incident.incidentType,
        description: incident.description ?? "",
        reason: incident.reason ?? "",
      });

      // mark GK on the other side
      output[opp].incidents.penalty.push({
        time: incident.time,
        incidentClass: incident.incidentClass,
        incidentType: incident.incidentType,
        description: incident.description ?? "",
        reason: incident.reason ?? "",
        GK: true,
      });
    }

    // Collect metadata into metaMap
    if (incident.incidentType) {
      if (!metaMap[incident.incidentType]) {
        metaMap[incident.incidentType] = new Set();
      }
      if (incident.incidentClass != null) {
        metaMap[incident.incidentType].add(incident.incidentClass);
      }
    }
  }

  // flatten metaData sets
  for (const type in metaMap) {
    output.metadata[type] = Array.from(metaMap[type]);
  }

  return output;
}

export function transformShotmap(data: any): TransformedShotmap {
  // accumulate unique values in Sets
  const shotTypes = new Set<string>();
  const situations = new Set<string>();
  const bodyParts = new Set<string>();

  // the two result arrays
  const home: TransformedShotmap["home"] = [];
  const away: TransformedShotmap["away"] = [];

  data.shotmap.forEach((shot: any) => {
    const sideArr = shot.isHome ? home : away;

    const entry = {
      id: shot.player?.id ?? null,
      name: shot.player?.name ?? "",
      shotType: shot.shotType,
      situation: shot.situation ?? "",
      bodyPart: shot.bodyPart ?? "",
      xg: shot.xg ?? 0,
      xgot: shot.xgot ?? 0,
      time: shot.time,
      coordinates: {
        player: shot.playerCoordinates ?? {},
        goalMouth: shot.goalMouthCoordinates ?? {},
        block: shot.blockCoordinates ?? null,
      },
      draw: shot.draw ?? {},
    };

    sideArr.push(entry);

    // collect for metadata
    if (shot.shotType) shotTypes.add(shot.shotType);
    if (shot.situation) situations.add(shot.situation);
    if (shot.bodyPart) bodyParts.add(shot.bodyPart);
  });

  return {
    home,
    away,
    metaData: {
      shotTypes: Array.from(shotTypes),
      situations: Array.from(situations),
      bodyParts: Array.from(bodyParts),
    },
  };
}

export function transformAvgPosition(data: any): TransformedAvgPosition {
  const simplify = (teamArray: any[]): AvgPositionEntry[] => {
    return teamArray.map((entry) => ({
      id: entry.player.id,
      name: entry.player.name,
      averageX: entry.averageX,
      averageY: entry.averageY,
      pointsCount: entry.pointsCount,
    }));
  };

  return {
    home: simplify(data.home || []),
    away: simplify(data.away || []),
  };
}
/**
 *
 * ------------ TRANSFORM FUNCTIONS ------------*
 *
 */

export async function heatmapPlayer(
  matchId: number,
  players: ExtractedPlayerBasicInfo
): Promise<PlayerHeatmap[]> {
  const allPlayers = [...players.home, ...players.away];

  const heatmapPromises = allPlayers.map(async (player) => {
    const url = `https://www.sofascore.com/api/v1/event/${matchId}/player/${player.id}/heatmap`;

    try {
      const response = await axios.get<unknown>(url);
      return {
        ...player,
        heatmap: response.data,
      } as PlayerHeatmap;
    } catch (err: any) {
      if (err.response?.status === 404) {
        console.warn(`⚠️ No heatmap for ${player.name} (${player.id})`);
      } else {
        console.error(
          `❌ Error fetching heatmap for ${player.name}:`,
          err.message
        );
      }
      return null;
    }
  });

  const results = await Promise.all(heatmapPromises);
  return results.filter((entry): entry is PlayerHeatmap => entry !== null);
}

export function evaluateScenarios(data: any) {
  const context = extractScenarioContext(data);
  const scenarios = getScenarioList();

  const homeMatchScenario = [];
  const awayMatchScenario = [];

  for (const scenario of scenarios) {
    try {
      const fn = new Function(
        ...Object.keys(context),
        `return ${scenario.script}`
      );
      const isMatch = fn(...Object.values(context));

      if (isMatch) {
        if (scenario.team === "home" || scenario.team === "both") {
          homeMatchScenario.push(Number(scenario.id));
        }
        if (scenario.team === "away" || scenario.team === "both") {
          awayMatchScenario.push(Number(scenario.id));
        }
      }
    } catch (e) {
      console.warn("❌ Error evaluating scenario:", scenario.name);
    }
  }

  return {
    home: { matchScenario: homeMatchScenario.sort((a, b) => a - b) },
    away: { matchScenario: awayMatchScenario.sort((a, b) => a - b) },
  };
}
