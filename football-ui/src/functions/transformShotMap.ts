import type { MatchPlayerShotRow } from "../types/MatchTables";

export function transformShotMap({
  match_cust_id,
  shots,
}: {
  match_cust_id: number;
  shots: any[];
}): MatchPlayerShotRow[] {
  return shots.map((s, idx) => ({
    shot_id: s.id ?? Number(`${match_cust_id}${idx}`),
    match_cust_id,
    player_cust_id: s.player?.id ?? s.playerId ?? 0,
    time: s.time ?? null,
    shot_type: s.shotType ?? null,
    situation: s.situation ?? null,
    body_part: s.bodyPart ?? null,
    xg: s.xg ?? null,
    xgot: s.xgot ?? null,
    details_json: s,
  }));
}
