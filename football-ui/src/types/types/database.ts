export interface Team {
  team_id: number;         // serial PK
  team_name: string;
  home_stadium: string | null;
  founded_year: number | null;
  logo_url: string | null;
  team_info: Record<string, any>;
}

export interface Competition {
  competition_id: number;   // serial PK
  competition_name: string;
  competition_type: string | null;
  season: string | null;
  country: string | null;
  competition_info: Record<string, any>;
}

export interface Player {
  player_id: number;      // serial PK
  name: string;
  first_name: string | null;
  last_name: string | null;
  team_id: number | null;
  position: string | null;
  birthdate: string | null;    // ISO date
  country: string | null;
  shirt_number: number | null;
  player_info: Record<string, any>;
}

export interface Match {
  match_id: number;       // serial PK
  home_team_id: number;
  away_team_id: number;
  competition_id: number;
  match_date: string;     // ISO timestamp
  stadium: string | null;
  round: string | null;
}

export interface MatchStats {
  schedule_id: number;    // FK → matches.match_id
  team_id: number;        // FK → teams.team_id
  period: 'ALL' | '1ST' | '2ND';
  stat_key: string;
  value: number;
  display: string;
  total: number | null;
}

export interface MatchIncident {
  schedule_id: number;    // FK → matches.match_id
  team_id: number;        // FK → teams.team_id
  player_id: number | null;
  type: string;           // e.g. 'goal','card'
  class: string | null;   // e.g. 'yellow','injury'
  minute: number;
  description: string | null;
}

export interface MatchPlayerStats {
  schedule_id: number;    // FK → matches.match_id
  player_id: number;      // FK → players.player_id
  stat_key: string;       // e.g. 'goals','rating'
  value: number;
}

export interface MatchShotmap {
  schedule_id: number;    // FK → matches.match_id
  player_id: number;      // FK → players.player_id
  team_id: number;        // FK → teams.team_id
  xg: number;
  xgot: number;
  situation: string | null;
  body_part: string | null;
  shot_type: string | null;
  minute: number;
}

export interface MatchAvgPosition {
  schedule_id: number;    // FK → matches.match_id
  player_id: number;      // FK → players.player_id
  team_id: number;        // FK → teams.team_id
  avg_x: number;
  avg_y: number;
  points: number;
}

export interface MatchHeatmap {
  schedule_id: number;    // FK → matches.match_id
  player_id: number;      // FK → players.player_id
  heatmap: Record<string, any>;
}
