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
  team_cust_id: number;
  score: number;
  halftime_score?: number;
  is_winner: boolean;
}

export interface MatchResultScenarioRow {
  match_cust_id: number;
  type: string;
  team_cust_id: number;
  value: number | string;
}

export interface MatchIncidentRow {
  match_cust_id: number;
  team_cust_id: number;
  player_cust_id?: number;
  minute: number;
  type: string;
  description: string;
  timestamp: string;
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
