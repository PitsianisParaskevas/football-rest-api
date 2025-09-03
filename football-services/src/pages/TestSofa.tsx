// src/pages/TestSofa.tsx
import { useMemo, useState } from "react";

type Resp =
  | { ok: true; status: number; url: string; body: any }
  | { ok: false; status: number; url: string; error: string; raw?: string };

function JsonView({ value }: { value: any }) {
  const text = useMemo(() => {
    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }, [value]);
  return (
    <pre
      style={{
        background: "#111",
        color: "#0f0",
        padding: 12,
        borderRadius: 8,
        overflow: "auto",
        maxHeight: 400,
        fontSize: 13,
      }}
    >
      {text}
    </pre>
  );
}

function parseSofaUrl(input: string): { uniqueTournamentId?: number; seasonId?: number } {
  if (!input) return {};
  let raw = input.trim();
  if (!/^https?:\/\//.test(raw)) {
    raw = "https://www.sofascore.com" + (raw.startsWith("/") ? "" : "/") + raw;
  }
  try {
    const u = new URL(raw);
    const parts = u.pathname.split("/").filter(Boolean);
    const uniqIdx = parts.findIndex((p) => /^\d+$/.test(p));
    const uniqueTournamentId =
      uniqIdx >= 0 ? Number(parts[uniqIdx]) : undefined;

    let seasonId: number | undefined;
    const hashMatch = u.hash.match(/#id:(\d+)/);
    if (hashMatch) seasonId = Number(hashMatch[1]);
    const qs = u.searchParams.get("season") || u.searchParams.get("seasonId");
    if (!seasonId && qs) seasonId = Number(qs);
    const seasonIdx = parts.findIndex((p) => p === "season");
    if (!seasonId && seasonIdx >= 0 && /^\d+$/.test(parts[seasonIdx + 1])) {
      seasonId = Number(parts[seasonIdx + 1]);
    }
    return { uniqueTournamentId, seasonId };
  } catch {
    return {};
  }
}

async function getJson(path: string): Promise<Resp> {
  const url = path.startsWith("http") ? path : path.startsWith("/")
    ? path
    : `/api/sofa/${path}`;
  try {
    const r = await fetch(url, { headers: { Accept: "application/json" } });
    const text = await r.text();
    let body: any = null;
    try { body = text ? JSON.parse(text) : null; } catch { body = text; }
    if (!r.ok) {
      return { ok: false, status: r.status, url, error: body?.message || r.statusText, raw: text };
    }
    return { ok: true, status: r.status, url, body };
  } catch (e: any) {
    return { ok: false, status: 0, url, error: e?.message || "Network error" };
  }
}

export default function TestSofa() {
  const [tourUrl, setTourUrl] = useState(
    "/tournament/football/italy/serie-a/23#id:76457"
  );
  const [eventId, setEventId] = useState<string>("14025088");
  const [customPath, setCustomPath] = useState<string>("unique-tournament/23/season/76457/standings");
  const [resp, setResp] = useState<Resp | null>(null);
  const [loading, setLoading] = useState(false);

  const ids = parseSofaUrl(tourUrl);
  const canStandings = !!ids.uniqueTournamentId && !!ids.seasonId;

  async function run(path: string) {
    setLoading(true);
    const r = await getJson(path);
    setResp(r);
    setLoading(false);
  }

  return (
    <div>
      <h2>🧪 Test Sofa</h2>

      <div style={{ display: "grid", gap: 12, maxWidth: 780 }}>
        <label>
          <div><b>Tournament URL</b> (π.χ. /tournament/.../23#id:76457)</div>
          <input
            value={tourUrl}
            onChange={(e) => setTourUrl(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="/tournament/football/italy/serie-a/23#id:76457"
          />
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
            Parsed → uniqueTournamentId: <b>{ids.uniqueTournamentId ?? "-"}</b>, seasonId: <b>{ids.seasonId ?? "-"}</b>
          </div>
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => run("/api/sofa/ping")} disabled={loading}>
            {loading ? "Loading..." : "Ping proxy"}
          </button>

          <button
            onClick={() =>
              run(
                `unique-tournament/${ids.uniqueTournamentId}/season/${ids.seasonId}/standings`
              )
            }
            disabled={loading || !canStandings}
            title={canStandings ? "" : "Συμπλήρωσε σωστό URL για να βρούμε IDs"}
          >
            Standings
          </button>

          <button
            onClick={() =>
              run(
                `unique-tournament/${ids.uniqueTournamentId}/season/${ids.seasonId}/standings/total`
              )
            }
            disabled={loading || !canStandings}
          >
            Standings / total
          </button>

          <button
            onClick={() =>
              run(
                `unique-tournament/${ids.uniqueTournamentId}/season/${ids.seasonId}/events`
              )
            }
            disabled={loading || !canStandings}
          >
            Events (season)
          </button>
        </div>

        <label>
          <div><b>Event ID</b> (π.χ. 14025088)</div>
          <input
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="14025088"
          />
        </label>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button onClick={() => run(`event/${eventId}/lineups`)} disabled={loading || !eventId}>
            Event lineups
          </button>
          <button onClick={() => run(`event/${eventId}/statistics`)} disabled={loading || !eventId}>
            Event statistics
          </button>
          <button onClick={() => run(`event/${eventId}/incidents`)} disabled={loading || !eventId}>
            Event incidents
          </button>
          <button onClick={() => run(`event/${eventId}/shotmap`)} disabled={loading || !eventId}>
            Event shotmap
          </button>
        </div>

        <label>
          <div><b>Custom path</b> (relative στο /api/sofa)</div>
          <input
            value={customPath}
            onChange={(e) => setCustomPath(e.target.value)}
            style={{ width: "100%", padding: 8 }}
            placeholder="unique-tournament/23/season/76457/standings"
          />
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => run(customPath)} disabled={loading}>
            GET custom
          </button>
          <button onClick={() => setResp(null)} disabled={loading}>
            Clear
          </button>
        </div>
      </div>

      {resp && (
        <div style={{ marginTop: 16 }}>
          <div style={{ marginBottom: 6 }}>
            <b>Status:</b> {resp.status} &nbsp; | &nbsp; <b>URL:</b>{" "}
            <code>{resp.url}</code>
          </div>
          {resp.ok ? <JsonView value={resp.body} /> : (
            <>
              <div style={{ color: "tomato", marginBottom: 8 }}>
                <b>Error:</b> {resp.error}
              </div>
              {resp.raw ? <JsonView value={resp.raw} /> : null}
            </>
          )}
        </div>
      )}
    </div>
  );
}
