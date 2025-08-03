import type { MatchIncidentRow } from "../types/MatchTables";

interface SofaIncident {
  id: number;
  incidentType: string;
  incidentClass?: string;
  type?: string;
  time?: { minute?: number };
  period?: number;
  team?: { id?: number; name?: string };
  player?: { id: number };
  assist?: { id: number };
  playerIn?: { id: number };
  playerOut?: { id: number };
  homeScore?: number;
  awayScore?: number;
  goalType?: string;
  bodyPart?: string;
  goalkeeper?: { id: number };
  description?: string;
  timestamp?: string;
  [key: string]: any;
}

export function transformMatchIncidents(
  matchId: number,
  incidents: SofaIncident[]
): MatchIncidentRow[] {
  return incidents.map((incident) => ({
    id: incident.id,
    incident_cust_id: incident.id,
    match_cust_id: matchId,
    team_cust_id: incident.team?.id ?? null, // required
    incident_type: incident.incidentType,
    type: incident.type ?? null, // required
    incident_class: incident.incidentClass ?? null,
    team_side: incident.team?.name?.toLowerCase() ?? null,
    time: incident.time?.minute ?? null,
    minute: incident.time?.minute ?? null, // required
    period: incident.period ?? null,
    player_id: incident.player?.id ?? null,
    assist_id: incident.assist?.id ?? null,
    player_in_id: incident.playerIn?.id ?? null,
    player_out_id: incident.playerOut?.id ?? null,
    home_score: incident.homeScore ?? null,
    away_score: incident.awayScore ?? null,
    goal_type: incident.goalType ?? null,
    body_part: incident.bodyPart ?? null,
    goalkeeper_id: incident.goalkeeper?.id ?? null,
    description: incident.description ?? null, // required
    timestampts: incident.timestamp ?? null, // fix this name if it's a typo!
    details_json: incident,
  }));
}
