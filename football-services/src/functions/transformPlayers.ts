import type { PlayerRow } from "../types/MatchTables";

export function transformPlayers(
  lineups: any,
  homeTeamCustId: number | null,
  awayTeamCustId: number | null
): PlayerRow[] {
  const processTeam = (
    team: any,
    teamSide: "home" | "away",
    teamId: number | null
  ): PlayerRow[] =>
    team.players
      .map((p: any) => {
        const player = p.player;
        if (!player || !player.id) return null;

        return {
          cust_id: player.id,
          name: player.name,
          slug: player.slug ?? null,
          short_name: player.shortName ?? null,
          position: player.position ?? p.position ?? null,
          height: player.height ?? null,
          country_code: player.country?.alpha2 ?? null,
          country_name: player.country?.name ?? null,
          birthdate: player.dateOfBirthTimestamp
            ? new Date(player.dateOfBirthTimestamp * 1000).toISOString()
            : null,
          market_value: player.proposedMarketValueRaw?.value ?? null,
          market_currency: player.proposedMarketValueRaw?.currency ?? null,
          team_cust_id: teamId,
          shirt_number: p.shirtNumber ?? null,
        };
      })
      .filter(Boolean);

  const processMissingPlayers = (
    missingList: any[],
    teamSide: "home" | "away",
    teamId: number | null
  ): PlayerRow[] =>
    missingList
      .map((entry: any) => {
        const player = entry.player;
        if (!player || !player.id) return null;

        return {          
          cust_id: player.id,
          name: player.name,
          slug: player.slug ?? null,
          short_name: player.shortName ?? null,
          position: player.position ?? null,
          height: player.height ?? null,
          country_code: player.country?.alpha2 ?? null,
          country_name: player.country?.name ?? null,
          birthdate: player.dateOfBirthTimestamp
            ? new Date(player.dateOfBirthTimestamp * 1000).toISOString()
            : null,
          market_value: player.proposedMarketValueRaw?.value ?? null,
          market_currency: player.proposedMarketValueRaw?.currency ?? null,
          team_cust_id: teamId,
          shirt_number: null,
        };
      })
      .filter(Boolean) as PlayerRow[];

  const players = [
    ...processTeam(lineups.home, "home", homeTeamCustId),
    ...processTeam(lineups.away, "away", awayTeamCustId),
  ];

  const missing = [
    ...(lineups.home?.missingPlayers
      ? processMissingPlayers(
          lineups.home.missingPlayers,
          "home",
          homeTeamCustId
        )
      : []),
    ...(lineups.away?.missingPlayers
      ? processMissingPlayers(
          lineups.away.missingPlayers,
          "away",
          awayTeamCustId
        )
      : []),
  ];

  return [...players, ...missing];
}
