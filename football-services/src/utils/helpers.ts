export function extractSofaIdsGeneralData(sofaURL: string): {
  tournamentId: number | null;
  seasonId: number | null;
} {
  const tournamentMatch = sofaURL.match(
    /tournament\/football\/[^/]+\/[^/]+\/(\d+)/
  );
  const seasonMatch = sofaURL.match(/id:(\d+)/);

  const tournamentId = tournamentMatch ? parseInt(tournamentMatch[1]) : null;
  const seasonId = seasonMatch ? parseInt(seasonMatch[1]) : null;

  return { tournamentId, seasonId };
}

export function extractSofaIdsMatchDay(sofaURL: string): { id: number | null } {
  const idMatch = sofaURL.match(/id:(\d+)/);
  return { id: idMatch ? parseInt(idMatch[1], 10) : null };
}

export function isNestedObject(value: any): boolean {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isFlattenableObject(
  value: any,
  allowedKeys: string[] = []
): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    (allowedKeys.length === 0 ||
      Object.keys(value).every((k) => allowedKeys.includes(k)))
  );
}

export function calculatePeriod(
  time: number | null | undefined
): string | undefined {
  if (time == null) return undefined;
  if (time <= 45) return "1st";
  if (time <= 90) return "2nd";
  if (time <= 105) return "Extra time 1st half";
  if (time <= 120) return "Extra time 2nd half";
  return "Penalties or undefined extended time";
}
