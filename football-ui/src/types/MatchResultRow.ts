export interface MatchResultRow {
  match_cust_id: number;
  home_score_ft: number;
  home_score_ht?: number;
  home_formation?: string;
  home_result: string;
  away_score_ft: number;
  away_score_ht?: number;
  away_formation?: string;
  away_result: string;
}
