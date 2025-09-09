import type { Team } from "@/types/team";

export interface Match {
  match_id: number; // internal DB id
  tournament_id: number; // FK -> tournaments
  cust_id: number; // external id
  round: number;
  match_date: Date;
  home_team_id: number;
  away_team_id: number;
}


export interface MatchWithTeams extends Omit<Match, "home_team_id" | "away_team_id"> {
  home_team: Team;
  away_team: Team;
}