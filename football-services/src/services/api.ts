const BASE = "/api"; // <-- relative path (proxy target)

function join(path: string) {
  // ensures exactly one slash between BASE and path
  return path.startsWith("/") ? `${BASE}${path}` : `${BASE}/${path}`;
}

async function postJSON(path: string, body: any) {
  const res = await fetch(join(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} -> ${res.status} ${text}`);
  }
  return res.json();
}

async function postInChunks(path: string, rows: any[], chunkSize = 800) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await postJSON(path, rows.slice(i, i + chunkSize));
  }
}

export const api = {
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
        // @ts-ignore – keys map 1:1 to functions above
        await api[key](rows);
      }
    }
  },
};
