import type { MatchResultRow } from "../types/MatchTables";

interface SofaEvent {
  homeScore: number;
  awayScore: number;
  homeTeam: { formation?: string };
  awayTeam: { formation?: string };
  homeScorePeriod1?: number;
  awayScorePeriod1?: number;
}

export function transformMatchResult(
  matchId: number,
  eventData: SofaEvent
): MatchResultRow {
  const homeFT = eventData.homeScore;
  const awayFT = eventData.awayScore;

  let homeResult: "win" | "loss" | "draw";
  let awayResult: "win" | "loss" | "draw";

  if (homeFT > awayFT) {
    homeResult = "win";
    awayResult = "loss";
  } else if (homeFT < awayFT) {
    homeResult = "loss";
    awayResult = "win";
  } else {
    homeResult = "draw";
    awayResult = "draw";
  }

  return {
    match_cust_id: matchId,
    home_score_ft: homeFT,
    away_score_ft: awayFT,
    home_score_ht: eventData.homeScorePeriod1 ?? null,
    away_score_ht: eventData.awayScorePeriod1 ?? null,
    home_formation: eventData.homeTeam.formation ?? null,
    away_formation: eventData.awayTeam.formation ?? null,
    home_result: homeResult,
    away_result: awayResult,
  };
}
