// src/services/apiMatchDay.ts
const BASE = "/api"; // via Vite proxy
const API_KEY = import.meta.env.VITE_API_KEY;

function join(path: string) {
  return path.startsWith("/") ? `${BASE}${path}` : `${BASE}/${path}`;
}

async function postJSON<T = unknown>(path: string, body: any) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (API_KEY) headers["x-api-key"] = API_KEY;

  const res = await fetch(join(path), {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} -> ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

async function postInChunks<T = unknown>(
  path: string,
  rows: any[],
  chunkSize = 800,
  retries = 2
) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        await postJSON<T>(path, chunk);
        lastErr = undefined;
        break;
      } catch (e) {
        lastErr = e;
        if (attempt === retries) throw e;
        await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
      }
    }
    if (lastErr) throw lastErr;
  }
}

export const matchDayApi = {
  players: (rows: any[]) => postInChunks("/players", rows),
  metadata_statistics: (rows: any[]) =>
    postInChunks("/metadata-statistics", rows),

  match_result: (rows: any[]) => postInChunks("/match-results", rows),
  match_result_scenarios: (rows: any[]) =>
    postInChunks("/match-result-scenarios", rows),
  match_stats: (rows: any[]) => postInChunks("/match-stats", rows),
  match_incident: (rows: any[]) => postInChunks("/match-incidents", rows),

  match_player_info: (rows: any[]) => postInChunks("/match-player-info", rows),
  match_player_stats: (rows: any[]) =>
    postInChunks("/match-player-stats", rows),
  match_player_shot: (rows: any[]) => postInChunks("/match-player-shot", rows), // singular
  match_player_heatmap: (rows: any[]) =>
    postInChunks("/match-player-heatmap", rows), // singular

  insertAll: async (data: Record<string, any>) => {
    const order = [
      "players",
      "metadata_statistics",
      "match_result",
      "match_stats",
      "match_player_info",
      "match_player_stats",
      "match_player_shot",
      "match_player_heatmap",
      "match_incident",
      "match_result_scenarios",
    ] as const;

    for (const key of order) {
      const rows = (data as any)[key];
      if (Array.isArray(rows) && rows.length) {
        // @ts-ignore keys map 1:1
        await matchDayApi[key](rows);
      }
    }
  },
};
