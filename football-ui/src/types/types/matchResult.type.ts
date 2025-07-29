// src/types/matchResult.type.ts

import type { TransformedStatistics } from "@/types/results.type";
import type { TransformedLineups } from "@/types/lineup.type";
import type { TransformedIncidents } from "@/types/incidetns.type";
import type { TransformedShotmap } from "@/types/shotmap.type";
import type { TransformedAvgPosition } from "@/types/avgPosition.type";
import type { PlayerHeatmap } from "@/types/basicPlayerInfo.type";

export interface MatchResult {
  metadata: {
    statistics: TransformedStatistics["metadata"];
    lineups: TransformedLineups["metadata"];
    incident: TransformedIncidents["metadata"];
    shotmap: TransformedShotmap["metaData"];
  };
  incidentsPeriod: {
    fullTimeScore: TransformedIncidents["fullTimeScore"];
    halfTimeScore: TransformedIncidents["halfTimeScore"];
  };
  home: TeamResult;
  away: TeamResult;
  incident: any; // raw incidents payload, if you need to keep it
}

export interface TeamResult {
  stats: TransformedStatistics["home"] | TransformedStatistics["away"];
  formation: TransformedLineups["home"]["formation"];
  incident: {
    points: number;
    result: string;
    goalFor: number;
    goalAgainst: number;
  };
  players: TransformedLineups["home"]["players"];
  statisticsPlayer: TransformedLineups["home"]["statisticsPlayer"] & {
    shots?: TransformedShotmap["home"];
    averagePosition?: TransformedAvgPosition["home"][number] | null;
    heatmap?: PlayerHeatmap["heatmap"] | null;
  }[];
  /** list of scenario‐IDs that matched (filled in by evaluateScenarios) */
  scenario: number[];
}
