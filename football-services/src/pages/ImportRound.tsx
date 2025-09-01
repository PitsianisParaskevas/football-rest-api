// src/pages/ImportRound.tsx
import { useMemo, useRef, useState } from "react";
import "../App.css";
import { searchCustIds, searchMatches, type MatchRow } from "../services/roundSearchService";
import { MatchDayService } from "../services/MatchDayService";
import { matchDayApi } from "../services/apiMatchDay";
import type { MatchDayData } from "../types/MatchDayData";

function parseCsvNums(input: string): number[] {
  return input
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

export default function ImportRound() {
  const [tournamentId, setTournamentId] = useState<string>("");
  const [roundsCsv, setRoundsCsv] = useState<string>("1"); // e.g. "1,2,3"
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<MatchRow[]>([]);
  const [ids, setIds] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Step 2: local fetched datasets
  const [fetching, setFetching] = useState(false);
  const [fetchProgress, setFetchProgress] = useState({ total: 0, done: 0, ok: 0, fail: 0 });
  const fetchedRef = useRef<Map<number, MatchDayData>>(new Map());

  // Step 3: import progress
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState({ total: 0, done: 0, ok: 0, fail: 0 });
  const [failures, setFailures] = useState<{ id: number; stage: "fetch" | "import"; error: string }[]>(
    []
  );

  const rounds = useMemo(() => parseCsvNums(roundsCsv), [roundsCsv]);

  async function handleSearch() {
    setLoading(true);
    setError(null);
    setRows([]);
    setIds([]);
    setFailures([]);
    fetchedRef.current.clear();
    setFetchProgress({ total: 0, done: 0, ok: 0, fail: 0 });
    setImportProgress({ total: 0, done: 0, ok: 0, fail: 0 });

    try {
      const tId = Number(tournamentId);
      if (!Number.isFinite(tId) || tId <= 0) {
        throw new Error("Provide a valid tournament_id (number).");
      }
      if (!rounds.length) {
        throw new Error("Provide at least one round (comma-separated).");
      }

      // IDs only (for fetch/import)
      const custIds = await searchCustIds({
        tournament_id: [tId],
        round: rounds,
        limit: 10000,
      });
      setIds(custIds);

      // Optional preview rows
      const found = await searchMatches({
        tournament_id: [tId],
        round: rounds,
        limit: 10000,
      });
      setRows(found);

      if (!custIds.length) setError("No matches found for those filters.");
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleFetchAll(concurrency = 3) {
    if (!ids.length) return;

    setFetching(true);
    setFailures([]);
    fetchedRef.current.clear();
    setFetchProgress({ total: ids.length, done: 0, ok: 0, fail: 0 });

    let index = 0;
    const newFailures: { id: number; stage: "fetch"; error: string }[] = [];

    const worker = async () => {
      while (true) {
        const i = index++;
        if (i >= ids.length) break;
        const id = ids[i];

        try {
          const data = await MatchDayService.getById(id);
          fetchedRef.current.set(id, data);
          setFetchProgress((p) => ({ ...p, done: p.done + 1, ok: p.ok + 1 }));
        } catch (e: any) {
          newFailures.push({ id, stage: "fetch", error: e?.message ?? String(e) });
          setFetchProgress((p) => ({ ...p, done: p.done + 1, fail: p.fail + 1 }));
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, ids.length) }, worker);
    await Promise.all(workers);

    if (newFailures.length) {
      setFailures((prev) => [...prev, ...newFailures]);
    }
    setFetching(false);
  }

  async function handleImportAll(concurrency = 2) {
    const entries = Array.from(fetchedRef.current.entries());
    if (!entries.length) {
      setError("Nothing fetched. Fetch matchday data first.");
      return;
    }

    setImporting(true);
    setError(null);
    setImportProgress({ total: entries.length, done: 0, ok: 0, fail: 0 });

    let index = 0;
    const newFailures: { id: number; stage: "import"; error: string }[] = [];

    const worker = async () => {
      while (true) {
        const i = index++;
        if (i >= entries.length) break;
        const [id, data] = entries[i];

        try {
          await matchDayApi.insertAll(data as any);
          setImportProgress((p) => ({ ...p, done: p.done + 1, ok: p.ok + 1 }));
        } catch (e: any) {
          newFailures.push({ id, stage: "import", error: e?.message ?? String(e) });
          setImportProgress((p) => ({ ...p, done: p.done + 1, fail: p.fail + 1 }));
        }
      }
    };

    const workers = Array.from({ length: Math.min(concurrency, entries.length) }, worker);
    await Promise.all(workers);

    if (newFailures.length) {
      setFailures((prev) => [...prev, ...newFailures]);
    }
    setImporting(false);
  }

  function clearAll() {
    setRows([]);
    setIds([]);
    setError(null);
    fetchedRef.current.clear();
    setFetchProgress({ total: 0, done: 0, ok: 0, fail: 0 });
    setImportProgress({ total: 0, done: 0, ok: 0, fail: 0 });
    setFailures([]);
  }

  return (
    <div>
      <h2>↪️ Import by Round (2-step: Fetch → Import)</h2>

      <div style={{ display: "grid", gap: 8, maxWidth: 520 }}>
        <label>
          <div>Tournament ID</div>
          <input
            value={tournamentId}
            onChange={(e) => setTournamentId(e.target.value)}
            placeholder="e.g. 17"
          />
        </label>

        <label>
          <div>Rounds (comma-separated)</div>
          <input
            value={roundsCsv}
            onChange={(e) => setRoundsCsv(e.target.value)}
            placeholder="e.g. 1,2,3"
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={handleSearch} disabled={loading}>
            {loading ? "Searching…" : "Search Matches"}
          </button>
          <button onClick={clearAll}>Clear</button>
        </div>
      </div>

      {error && <p style={{ color: "red", marginTop: 12 }}>{error}</p>}

      {rows.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <b>Found:</b> {rows.length} rows — unique cust_id: {ids.length}
          <details style={{ marginTop: 8 }}>
            <summary>Show IDs</summary>
            <div style={{ marginTop: 8, fontFamily: "monospace" }}>{ids.join(", ")}</div>
          </details>

          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={() => handleFetchAll(3)} disabled={fetching}>
              {fetching
                ? `Fetching… ${fetchProgress.done}/${fetchProgress.total}`
                : `Fetch matchday data (${ids.length})`}
            </button>

            <button
              onClick={() => handleImportAll(2)}
              disabled={importing || fetchedRef.current.size === 0}
              title={
                fetchedRef.current.size
                  ? `Will import ${fetchedRef.current.size} fetched matches`
                  : "Fetch data first"
              }
            >
              {importing
                ? `Importing… ${importProgress.done}/${importProgress.total}`
                : `Import to DB (${fetchedRef.current.size})`}
            </button>
          </div>

          {/* Progress summary */}
          {(fetching || fetchedRef.current.size > 0) && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <b>Fetch summary</b>
              <div>Total: {fetchProgress.total}</div>
              <div>
                Done: {fetchProgress.done} — OK: {fetchProgress.ok} — Failed: {fetchProgress.fail}
              </div>
              <div>Fetched datasets ready: {fetchedRef.current.size}</div>
            </div>
          )}

          {(importing || importProgress.total > 0) && (
            <div
              style={{
                marginTop: 12,
                padding: 12,
                border: "1px solid #ddd",
                borderRadius: 8,
              }}
            >
              <b>Import summary</b>
              <div>Total: {importProgress.total}</div>
              <div>
                Done: {importProgress.done} — OK: {importProgress.ok} — Failed: {importProgress.fail}
              </div>
            </div>
          )}

          {failures.length > 0 && (
            <details style={{ marginTop: 8 }}>
              <summary>Show failures ({failures.length})</summary>
              <ul style={{ marginTop: 8 }}>
                {failures.map((f) => (
                  <li key={`${f.stage}-${f.id}`}>
                    [{f.stage}] #{f.id}: {f.error}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </div>
  );
}
