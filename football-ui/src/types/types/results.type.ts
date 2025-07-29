// exactly as you had it for your transformed shape

export interface TransformedStatistics {
  metadata: {
    group: string;
    name: string;
    key: string;
  }[];
  home: {
    [period: string]: {
      [key: string]: { value: number; display: string; total?: number };
    };
  };
  away: {
    [period: string]: {
      [key: string]: { value: number; display: string; total?: number };
    };
  };
}
