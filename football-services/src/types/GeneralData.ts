// src/types/GeneralData.ts

export interface Team {
  cust_id: number;
  name: string;
  slug: string;
  shortName: string;
  nameCode: string;
  countryName: string;
  countrySlug: string;
}

export interface Tournament {
  cust_id: number;
  name: string;
  slug: string;
  countryName: string;
  countrySlug: string;
  rounds: number;
  total_teams: number;
}

export interface TournamentTeam {
  tournament_cust_id: number;
  team_cust_id: number;
}

export interface Match {
  tournament_id: number;
  cust_id: number;
  round: number;
  match_date: string; // ISO format
  home_team_id: number;
  away_team_id: number;
}

export interface GeneralData {
  tournament: Tournament;
  teams: Team[];
  tournament_team: TournamentTeam[];
  matches: Match[];
}
