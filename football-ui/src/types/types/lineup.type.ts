// src/types/lineups.types.ts

export interface TransformedLineups {
  metadata: {
    statisticsKeys: string[];
  };
  home: TransformedTeam;
  away: TransformedTeam;
}

export interface TransformedTeam {
  formation: string;
  players: PlayerData[];
  statisticsPlayer: PlayerStats[];
  missingPlayers: MissingData[];
  bestPlayer: BestPlayer | null;
}

export interface PlayerData {
  id: number;
  name: string;
  firstName: string;
  lastName: string;
  slug: string;
  shortName: string;
  position: string;
  jerseyNumber: string;
  height: number;
  userCount: number;
  country: any;
  marketValueCurrency: string;
  dateOfBirthTimestamp: number;
  proposedMarketValueRaw: any;
  teamId: number | null;
  shirtNumber: string | number;
}

export interface PlayerStats {
  id: number;
  name: string;
  userCount: number;
  proposedMarketValueRaw: any;
  substitute: boolean | "noSubstitute";
  statistics: Record<string, number | string>;
}

export interface MissingData {
  id: number;
  name: string;
  userCount: number;
  type: string;
  reason: number;
}

export interface BestPlayer {
  id: number;
  name: string;
  userCount: number;
  rating: number;
}
