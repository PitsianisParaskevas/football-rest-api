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
