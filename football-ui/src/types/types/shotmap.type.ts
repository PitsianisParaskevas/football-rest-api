export interface ShotCoordinates {
  player: Record<string, number>;
  goalMouth: Record<string, number>;
  block: Record<string, number> | null;
}

/**
 * A single shot entry, including metadata and drawing instructions.
 */
export interface ShotEntry {
  id: number | null;
  name: string;
  shotType: string;
  situation: string;
  bodyPart: string;
  xg: number;
  xgot: number;
  time: number;
  coordinates: ShotCoordinates;
  draw: Record<string, any>;
}

/**
 * The transformed shotmap object you return from transformShotmap().
 */
export interface TransformedShotmap {
  home: ShotEntry[];
  away: ShotEntry[];
  metaData: {
    shotTypes: string[];
    situations: string[];
    bodyParts: string[];
  };
}
