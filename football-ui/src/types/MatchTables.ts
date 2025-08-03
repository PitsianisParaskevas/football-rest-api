// src/types/MatchTables.ts

export type PlayerRow = {
  cust_id: number; // External Sofascore player ID
  name: string; // Full player name
  slug: string | null; // URL-friendly name
  short_name: string | null; // Abbreviated name
  position: string | null; // Position: "G", "D", "M", "F"
  height: number | null; // Height in centimeters
  country_code: string | null; // ISO 3166-1 alpha-2 code
  country_name: string | null; // Country full name
  birthdate: string | null; // ISO date string, e.g., "1992-04-15T00:00:00.000Z"
  market_value: number | null; // Market value in raw currency (e.g., cents)
  market_currency: string | null; // Currency symbol or code, e.g., "EUR", "USD"
  team_cust_id: number | null; // External team ID from Sofascore
  shirt_number: number | null; // Player jersey number
};

export interface MetadataStatisticRow {
  key: string;
  name: string;
  group: string;
  description?: string | null;
}

export interface MatchStatisticsRow {
  match_cust_id: number;
  team_cust_id: number;
  team_side: "home" | "away";
  stat_key: string;
  phase: string; // e.g., "ALL", "1ST", "2ND"
  value: number | null;
  display: string | null;
  total: number | null;
}

export interface MatchResultRow {
  match_cust_id: number;
  home_score_ft: number;
  home_score_ht: number | null;
  home_formation: string | null;
  home_result: "win" | "loss" | "draw";
  away_score_ft: number;
  away_score_ht: number | null;
  away_formation: string | null;
  away_result: "win" | "loss" | "draw";
}

export interface MatchResultScenarioRow {
  match_cust_id: number;
  type: string;
  team_cust_id: number;
  value: number | string;
}

export interface MatchIncidentRow {
  id: number; // primary key
  incident_cust_id: number | null;
  match_cust_id: number;
  team_cust_id: number | null;
  incident_type: string;
  type: string | null;
  incident_class: string | null;
  team_side: string | null;
  time: number | null;
  minute: number | null;
  period: number | null;
  player_id: number | null;
  assist_id: number | null;
  player_in_id: number | null;
  player_out_id: number | null;
  home_score: number | null;
  away_score: number | null;
  goal_type: string | null;
  body_part: string | null;
  goalkeeper_id: number | null;
  description: string | null;
  timestampts: string | null; // likely typo, suggest renaming to 'timestamp'
  details_json: any;
}

export interface MatchPlayerInfoRow {
  match_cust_id: number;
  player_cust_id: number;
  team_cust_id: number;
  name: string;
  position: string;
  is_substitute: boolean;
}

export interface MatchPlayerStatsRow {
  match_cust_id: number;
  player_cust_id: number;
  stat_key: string;
  stat_value: number | null;
}

export interface MatchPlayerShotRow {
  match_cust_id: number;
  player_cust_id: number;
  x: number;
  y: number;
  result: string;
  xg: number;
}

export interface MatchPlayerHeatmapRow {
  match_cust_id: number;
  player_cust_id: number;
  x: number;
  y: number;
  value: number;
}
