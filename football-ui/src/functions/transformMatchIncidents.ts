import type {
  MatchIncidentRow,
  MetadataStatisticRow,
} from "../types/MatchTables";
import { calculatePeriod } from "../utils/helpers";

interface SofaIncident {
  id: number;
  incidentType: string;
  incidentClass?: string;
  type?: string;
  description?: string;
  time?: number;
  addedTime?: number;
  isHome?: boolean;
  team?: { id?: number };
  player?: { id: number };
  assist?: { id: number };
  playerIn?: { id: number };
  playerOut?: { id: number };
  homeScore?: number;
  awayScore?: number;
  goalType?: string;
  bodyPart?: string;
  goalkeeper?: { id: number };
  text?: string;
  [key: string]: any;
}

export function transformMatchIncidents(
  matchId: number,
  homeTeamId: number,
  awayTeamId: number,
  incidents: SofaIncident[]
): {
  match_incident: MatchIncidentRow[];
  metadata_statistics: MetadataStatisticRow[];
} {
  const seenTypes = new Set<string>();
  const metadata: MetadataStatisticRow[] = [];

  const match_incident: MatchIncidentRow[] = incidents.map((incident) => {
    const team_side =
      incident.isHome === true
        ? "home"
        : incident.isHome === false
        ? "away"
        : undefined;

    const isPeriodIncident = incident.incidentType === "period";
    const incident_class = isPeriodIncident
      ? incident.text ?? undefined
      : incident.incidentClass ?? undefined;

    // Collect unique incidentType metadata
    const typeKey = incident.incidentType;
    if (typeKey && !seenTypes.has(typeKey)) {
      seenTypes.add(typeKey);
      metadata.push({
        key: typeKey,
        name: typeKey
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        group: "incident",
        description: null,
      });
    }

    return {
      cust_incident_id: incident.id,
      cust_match_id: matchId,
      cust_team_id:
        team_side === "home"
          ? homeTeamId
          : team_side === "away"
          ? awayTeamId
          : undefined,
      incident_type: incident.incidentType,
      type: incident.type ?? undefined,
      incident_class,
      description: incident.description ?? undefined,
      team_side,
      time: incident.time ?? undefined,
      added_time: incident.addedTime ?? undefined,
      period: calculatePeriod(incident.time),
      player_id: incident.player?.id ?? undefined,
      assist_id: incident.assist?.id ?? undefined,
      player_in_id: incident.playerIn?.id ?? undefined,
      player_out_id: incident.playerOut?.id ?? undefined,
      goalkeeper_id: incident.goalkeeper?.id ?? undefined,
      home_score: incident.homeScore ?? undefined,
      away_score: incident.awayScore ?? undefined,
      goal_type: incident.goalType ?? undefined,
      body_part: incident.bodyPart ?? undefined,
      details_json: incident,
    };
  });

  return { match_incident, metadata_statistics: metadata };
}
