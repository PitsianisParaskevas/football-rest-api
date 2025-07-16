// src/types/basicPlayerInfo.type.ts

/**
 * Minimal info for a player used when fetching heatmap data.
 */
export interface PlayerBasicInfo {
  id: number;
  name: string;
  slug: string;
}

/**
 * Raw heatmap data returned by the Sofascore API for a single player.
 * Structure can vary, so we use a generic record.
 */
export type HeatmapData = Record<string, any>;

/**
 * A player with their basic info and associated raw heatmap payload.
 */
export interface PlayerHeatmap extends PlayerBasicInfo {
  heatmap: HeatmapData;
}

/**
 * Lists of minimal player info for home and away teams,
 * used as input when fetching heatmaps.
 */
export interface ExtractedPlayerBasicInfo {
  home: PlayerBasicInfo[];
  away: PlayerBasicInfo[];
}
