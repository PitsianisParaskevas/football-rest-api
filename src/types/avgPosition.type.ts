export interface AvgPositionEntry {
  id: number;
  name: string;
  averageX: number;
  averageY: number;
  pointsCount: number;
}

/**
 * Transformed structure for average positions of both teams.
 */
export interface TransformedAvgPosition {
  home: AvgPositionEntry[];
  away: AvgPositionEntry[];
}
