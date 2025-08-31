// adjust BASE if your backend is mounted at /api
const BASE = "/api";

async function postJSON(path: string, body: any) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

// optional: chunk big arrays (shots/heatmaps can be large)
async function postInChunks(path: string, rows: any[], chunkSize = 800) {
  for (let i = 0; i < rows.length; i += chunkSize) {
    await postJSON(path, rows.slice(i, i + chunkSize));
  }
}

/** One function per backend route you listed */
export const api = {
  players: (rows: any[]) => postInChunks("/players", rows),

  metadata_statistics: (rows: any[]) =>
    postInChunks("/metadata-statistics", rows),

  match_result: (rows: any[]) => postInChunks("/match-results", rows),

  match_stats: (rows: any[]) => postInChunks("/match-stats", rows),

  match_player_info: (rows: any[]) => postInChunks("/match-player-info", rows),

  match_player_stats: (rows: any[]) =>
    postInChunks("/match-player-stats", rows),

  match_player_shot: (rows: any[]) => postInChunks("/match-player-shot", rows), // <- singular, as in your list

  match_player_heatmap: (rows: any[]) =>
    postInChunks("/match-player-heatmap", rows),

  match_incident: (rows: any[]) => postInChunks("/match-incidents", rows),

  match_result_scenarios: (rows: any[]) =>
    postInChunks("/match-result-scenarios", rows),
};
