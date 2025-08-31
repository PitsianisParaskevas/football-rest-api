// src/services/RoundImportService.ts
import axios from "axios";
import { MatchDayService } from "./MatchDayService";
import { matchDayApi } from "./apiMatchDay";
import { extractSofaIdsGeneralData } from "../utils/helpers";

export type MatchRow = {
  tournament_id: number | string;
  cust_id: number | string; // Sofascore event id
  round: number;
  match_id?: number | string;
  match_date?: string;
  home_team_id?: number | string;
  away_team_id?: number | string;
};

export type ImportResult = {
  id: number;
  ok: boolean;
  error?: string;
};

// Discriminated shapes
type WithUrl = {
  tournamentUrl: string;
  tournamentId?: never;
  seasonId?: never;
};
type WithIds = {
  tournamentUrl?: never;
  tournamentId: number;
  seasonId: number;
};
type Ctor = WithUrl | WithIds;

// Type guard: ensures tournamentUrl is a string
function isWithUrl(opts: Ctor): opts is WithUrl {
  return typeof (opts as any).tournamentUrl === "string";
}

export class RoundImportService {
  private tournamentId: number;
  private seasonId: number;

  constructor(opts: Ctor) {
    if (isWithUrl(opts)) {
      const { tournamentId, seasonId } = extractSofaIdsGeneralData(
        opts.tournamentUrl
      );
      if (!tournamentId || !seasonId) {
        throw new Error("❌ Invalid tournament URL (missing ids).");
      }
      this.tournamentId = tournamentId;
      this.seasonId = seasonId;
    } else {
      this.tournamentId = Number(opts.tournamentId);
      this.seasonId = Number(opts.seasonId);
      if (!this.tournamentId || !this.seasonId) {
        throw new Error("❌ Provide tournamentId and seasonId.");
      }
    }
  }

  /** Fetch Sofascore event ids for a given round */
  async fetchRoundEventIds(round: number): Promise<number[]> {
    if (!round || round < 1)
      throw new Error("Round must be a positive number.");
    const base = `https://www.sofascore.com/api/v1/unique-tournament/${this.tournamentId}/season/${this.seasonId}`;
    const url = `${base}/events/round/${round}`;
    const res = await axios.get(url);
    const events: any[] = res.data?.events ?? [];
    return events.map((e) => Number(e.id)).filter((n) => Number.isFinite(n));
  }

  /** Import everything for a Sofascore round: fetch ids -> fetch matchday -> insertAll */
  async importRound(round: number, concurrency = 2): Promise<ImportResult[]> {
    const ids = await this.fetchRoundEventIds(round);
    return this.importByMatchIds(ids, concurrency);
  }

  /** Import using DB rows that already contain the event id as `cust_id` */
  async importFromRows(
    rows: MatchRow[],
    concurrency = 2
  ): Promise<ImportResult[]> {
    const ids = rows
      .map((r) => Number(r.cust_id))
      .filter((n) => Number.isFinite(n) && n > 0);
    return this.importByMatchIds(ids, concurrency);
  }

  /**
   * Core worker: for each Sofascore event id:
   *  - build MatchDayData via MatchDayService
   *  - POST all sections to your backend via matchDayApi.insertAll
   */
  async importByMatchIds(
    ids: number[],
    concurrency = 2
  ): Promise<ImportResult[]> {
    if (!ids.length) return [];

    const results: ImportResult[] = new Array(ids.length);
    let index = 0;

    // helper: create a fake URL that MatchDayService can parse (#id:123)
    const idToFakeUrl = (id: number) =>
      `https://www.sofascore.com/football/match/_/_#id:${id}`;

    const worker = async () => {
      while (true) {
        const i = index++;
        if (i >= ids.length) break;
        const id = ids[i];

        try {
          const svc = new MatchDayService(idToFakeUrl(id));
          const data = await svc.getMatchDayData();
          await matchDayApi.insertAll(data as any);
          results[i] = { id, ok: true };
        } catch (e: any) {
          results[i] = { id, ok: false, error: e?.message ?? String(e) };
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(Math.max(concurrency, 1), ids.length) },
      worker
    );
    await Promise.all(workers);
    return results;
  }
}
