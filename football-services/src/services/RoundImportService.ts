// src/services/RoundImportService.ts
import { MatchDayService } from "./MatchDayService";
import { matchDayApi } from "./apiMatchDay";

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

/**
 * Importer that works from a list of Sofascore event ids (cust_id) or rows.
 * No constructor args needed.
 *
 * NOTE: Ensure your apiMatchDay attaches x-api-key for POSTs.
 */
export class RoundImportService {
  // Make constructor optional for backward compatibility (even if someone passes args)
  constructor(_opts?: unknown) {}

  /** Import using Sofascore event ids (cust_id) */
  async importByMatchIds(
    ids: number[],
    concurrency = 2
  ): Promise<ImportResult[]> {
    const clean = ids.filter((n) => Number.isFinite(n) && n > 0);
    if (!clean.length) return [];

    const results: ImportResult[] = new Array(clean.length);
    let index = 0;

    const worker = async () => {
      while (true) {
        const i = index++;
        if (i >= clean.length) break;
        const id = clean[i];

        try {
          // MatchDayService accepts numeric event id
          const svc = new MatchDayService(id);
          const data = await svc.getMatchDayData();
          await matchDayApi.insertAll(data as any);
          results[i] = { id, ok: true };
        } catch (e: any) {
          results[i] = { id, ok: false, error: e?.message ?? String(e) };
        }
      }
    };

    const workers = Array.from(
      { length: Math.min(Math.max(concurrency, 1), clean.length) },
      worker
    );
    await Promise.all(workers);
    return results;
  }

  /** Import using DB rows that contain `cust_id` */
  async importFromRows(
    rows: MatchRow[],
    concurrency = 2
  ): Promise<ImportResult[]> {
    const ids = rows
      .map((r) => Number(r.cust_id))
      .filter((n) => Number.isFinite(n) && n > 0);
    return this.importByMatchIds(ids, concurrency);
  }
}

// Default export so `import RoundImportService from ...` works
export default RoundImportService;
