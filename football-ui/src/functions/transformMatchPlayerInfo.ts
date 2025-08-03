import type {
  MatchIncidentRow,
  MatchPlayerInfoRow,
} from "../types/MatchTables";

interface LineupPlayer {
  player: { id: number };
  teamId: number;
  substitute: boolean;
  statistics?: {
    minutesPlayed?: number;
    rating?: number;
  };
}

export function transformMatchPlayerInfo(
  matchId: number,
  incidents: MatchIncidentRow[],
  lineupPlayers: LineupPlayer[]
): MatchPlayerInfoRow[] {
  const FT_TIME = 90;

  const subsIn: Record<number, number> = {};

  for (const incident of incidents) {
    if (incident.incident_type === "substitution") {
      const time = incident.time ?? FT_TIME;

      if (typeof incident.player_in_id === "number") {
        subsIn[incident.player_in_id] = time;
      }
    }
  }

  return lineupPlayers.map((p): MatchPlayerInfoRow => {
    const playerId = p.player.id;
    const isStarter = !p.substitute;

    const rating =
      typeof p.statistics?.rating === "number" ? p.statistics.rating : null;
    const minutesPlayed =
      typeof p.statistics?.minutesPlayed === "number"
        ? p.statistics.minutesPlayed
        : subsIn[playerId]
        ? FT_TIME - subsIn[playerId]
        : null;

    const wasSubbedOff =
      isStarter && typeof minutesPlayed === "number" && minutesPlayed < FT_TIME;

    return {
      match_cust_id: matchId,
      player_cust_id: playerId,
      starter: isStarter,
      substitute: p.substitute || wasSubbedOff,
      minutes_played: minutesPlayed,
      rating,
    };
  });
}
