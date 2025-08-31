import { useMemo, useState } from "react";
import "../App.css";
import { MatchDayService } from "../services/MatchDayService";
import { matchDayApi } from "../services/apiMatchDay";

type MatchRow = {
  match_id: string | number;
  tournament_id: string | number;
  cust_id: string | number; // Sofascore event id
  round: number;
  match_date?: string;
  home_team_id?: string | number;
  away_team_id?: string | number;
};

type ImportResult = { id: number; ok: boolean; error?: string };

const BASE = "/api"; // via Vite proxy

export default function ImportRound() {
  const [tournamentId, setTournamentId] = useState<string>("");
  const [round, setRound] = useState<string>("1");

  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);

  const [rows, setRows] = useState<MatchRow[]>([]);
  const [manualIds, setManualIds] = useState<string>("");

  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const roundNum = useMemo(() => Number(round) || 0, [round]);
  const idsFromRows = useMemo(
    () =>
      rows
        .map((r) => Number(r.cust_id))
        .filter((n) => Number.isFinite(n) && n > 0),
    [rows]
  );

  function parseManualIds(): number[] {
    return manualIds
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean)
      .map((s) => Number(s))
      .filter((n) => Number.isFinite(n) && n > 0);
  }

  async function fetchMatchesByRound() {
    setFetching(true);
    setError(null);
    setMsg(null);
    setResults(null);
    setRows([]);

    try {
      const tId = Number(tournamentId);
      if (!tId) throw new Error("Please enter a valid tournament cust_id.");
      if (!roundNum) throw new Error("Round must be a positive number.");

      const url = `${BASE}/matches?tournament_id=${tId}&round=${roundNum}`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`/matches -> ${res.status} ${text}`);
      }
      const data: MatchRow[] = await res.json();
      setRows(data);
      setMsg(`Found ${data.length} match(es) for round ${roundNum}.`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setFetching(false);
    }
  }

  async function importByIds(ids: number[], concurrency = 2) {
    if (!ids.length) {
      setError("No valid event IDs to import.");
      return;
    }
    setImporting(true);
    setError(null);
    setMsg(null);
    setResults(null);

    try {
      const results: ImportResult[] = new Array(ids.length);
      let index = 0;

      const worker = async () => {
        while (true) {
          const i = index++;
          if (i >= ids.length) break;
          const id = ids[i];
          try {
            const svc = new MatchDayService(id); // accepts numeric id
            const data = await svc.getMatchDayData();
            await matchDayApi.insertAll(data as any);
            results[i] = { id, ok: true };
          } catch (err: any) {
            results[i] = { id, ok: false, error: err?.message ?? String(err) };
          }
        }
      };

      const workers = Array.from(
        { length: Math.min(Math.max(concurrency, 1), ids.length) },
        worker
      );
      await Promise.all(workers);

      setResults(results);
      const ok = results.filter((r) => r.ok).length;
      setMsg(`Imported ${ok}/${results.length} matches.`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setImporting(false);
    }
  }

  return (
    <div>
      <h2>📦 Import Round</h2>

      <div className="card" style={{ padding: 12, marginBottom: 12 }}>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
        >
          <label>
            Tournament cust_id
            <input
              type="number"
              value={tournamentId}
              onChange={(e) => setTournamentId(e.target.value)}
              placeholder="e.g. 17"
            />
          </label>

          <label>
            Round
            <input
              type="number"
              value={round}
              onChange={(e) => setRound(e.target.value)}
              min={1}
              step={1}
              placeholder="e.g. 1"
            />
          </label>
        </div>

        <div
          style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}
        >
          <button
            onClick={fetchMatchesByRound}
            disabled={fetching || !roundNum}
          >
            {fetching ? "Fetching…" : "Fetch matches from DB"}
          </button>

          <button
            onClick={() => importByIds(idsFromRows)}
            disabled={importing || idsFromRows.length === 0}
            title={
              idsFromRows.length
                ? `Import ${idsFromRows.length} match(es)`
                : "No data"
            }
          >
            {importing
              ? "Importing…"
              : `Import round${
                  idsFromRows.length ? ` (${idsFromRows.length})` : ""
                }`}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      {msg && <p>✅ {msg}</p>}

      {/* Preview event ids fetched from DB */}
      {idsFromRows.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <b>Event IDs from DB</b>
          <div
            style={{
              marginTop: 6,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {idsFromRows.join(", ")}
          </div>
        </div>
      )}

      {/* Optional: manual ids */}
      <div className="card" style={{ padding: 12 }}>
        <b>Or import by Sofascore event IDs</b>
        <textarea
          value={manualIds}
          onChange={(e) => setManualIds(e.target.value)}
          placeholder="Paste ids separated by comma or space, e.g. 12436870 12436888"
          rows={3}
          style={{ width: "100%", marginTop: 8 }}
        />
        <div style={{ marginTop: 8 }}>
          <button
            onClick={() => importByIds(parseManualIds())}
            disabled={importing}
          >
            {importing ? "Importing…" : "Import by IDs"}
          </button>
        </div>
      </div>

      {/* Results */}
      {results && (
        <div className="card" style={{ padding: 12, marginTop: 12 }}>
          <b>Results ({results.length})</b>
          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
            {results.map((r) => (
              <div
                key={r.id}
                style={{
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #eee",
                  background: r.ok ? "#f2fff2" : "#fff5f5",
                }}
              >
                <code>id: {r.id}</code> — {r.ok ? "OK" : `FAILED: ${r.error}`}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
