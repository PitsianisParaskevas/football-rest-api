import { useMemo, useState } from "react";
import "../App.css";
import { RoundImportService } from "../services/RoundImportService";

type ImportRow = { id: number; ok: boolean; error?: string };

export default function ImportRound() {
  const [tournamentId, setTournamentId] = useState<string>("");
  const [seasonId, setSeasonId] = useState<string>("");
  const [round, setRound] = useState<string>("1");

  const [fetching, setFetching] = useState(false);
  const [importing, setImporting] = useState(false);

  const [eventIds, setEventIds] = useState<number[]>([]);
  const [results, setResults] = useState<ImportRow[] | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const roundNum = useMemo(() => Number(round) || 0, [round]);

  function buildService(): RoundImportService {
    const tId = Number(tournamentId);
    const sId = Number(seasonId);
    if (!tId || !sId) {
      throw new Error("Please enter both tournament cust_id and season id.");
    }
    return new RoundImportService({ tournamentId: tId, seasonId: sId });
  }

  async function handleFetchIds() {
    setFetching(true);
    setError(null);
    setMsg(null);
    setResults(null);
    setEventIds([]);
    try {
      const svc = buildService();
      if (!roundNum) throw new Error("Round must be a positive number.");
      const ids = await svc.fetchRoundEventIds(roundNum);
      setEventIds(ids);
      setMsg(`Found ${ids.length} event id(s) for round ${roundNum}.`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setFetching(false);
    }
  }

  async function handleImportRound() {
    setImporting(true);
    setError(null);
    setMsg(null);
    setResults(null);
    try {
      const svc = buildService();
      if (!roundNum) throw new Error("Round must be a positive number.");
      const res = await svc.importRound(roundNum);
      setResults(res);
      const ok = res.filter((r) => r.ok).length;
      setMsg(`Imported ${ok}/${res.length} matches for round ${roundNum}.`);
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
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 8,
          }}
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
            Season id
            <input
              type="number"
              value={seasonId}
              onChange={(e) => setSeasonId(e.target.value)}
              placeholder="e.g. 61627"
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
          <button onClick={handleFetchIds} disabled={fetching || !roundNum}>
            {fetching ? "Fetching…" : "Fetch event IDs"}
          </button>
          <button onClick={handleImportRound} disabled={importing || !roundNum}>
            {importing ? "Importing…" : "Import round"}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}
      {msg && <p>✅ {msg}</p>}

      {eventIds.length > 0 && (
        <div className="card" style={{ padding: 12, marginBottom: 12 }}>
          <b>Event IDs</b>
          <div
            style={{
              marginTop: 6,
              fontFamily: "monospace",
              whiteSpace: "pre-wrap",
            }}
          >
            {eventIds.join(", ")}
          </div>
        </div>
      )}

      {results && (
        <div className="card" style={{ padding: 12 }}>
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
