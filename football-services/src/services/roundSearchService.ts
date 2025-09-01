// src/services/roundSearchService.ts
import axios from "axios";

export type MatchRow = {
  match_id: number;
  tournament_id: number;
  cust_id: number;   // Sofascore event id
  round: number;
  match_date: string;
  home_team_id: number;
  away_team_id: number;
};

export type SearchBody =
  | {
      // independent filters
      tournament_id?: number | number[];
      round?: number | number[];
      limit?: number;
      offset?: number;
    }
  | {
      // pairwise filters
      pairs: { tournament_id: number; round: number }[];
      limit?: number;
      offset?: number;
    };

// Axios instance (Vite proxy: /api -> http://localhost:3000)
const http = axios.create({
  baseURL: "/api",
  timeout: 30000,
});

/** Get full rows (normalized whether controller returns {rows:[]} or []) */
export async function searchMatches(body: SearchBody): Promise<MatchRow[]> {
  const { data } = await http.post<{ rows: MatchRow[] } | MatchRow[]>(
    "/matches/search",
    body,
    { headers: { "Content-Type": "application/json", Accept: "application/json" } }
  );
  return Array.isArray(data) ? data : data.rows;
}

/** Get unique cust_id list only (numbers) */
export async function searchCustIds(body: SearchBody): Promise<number[]> {
  const rows = await searchMatches(body);
  const ids = rows
    .map((r) => Number(r.cust_id))
    .filter((n) => Number.isFinite(n) && n > 0);
  // unique
  return Array.from(new Set(ids));
}
