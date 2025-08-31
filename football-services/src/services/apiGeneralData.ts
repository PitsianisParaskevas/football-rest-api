// uses Vite dev proxy: /api -> http://localhost:3000
const BASE = "/api";

function join(path: string) {
  return path.startsWith("/") ? `${BASE}${path}` : `${BASE}/${path}`;
}

async function postJSON<T = unknown>(path: string, body: any) {
  const res = await fetch(join(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${path} -> ${res.status} ${text}`);
  }
  return res.json() as Promise<T>;
}

function toArray<T>(x: T | T[] | null | undefined): T[] {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
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

export const generalApi = {
  tournaments: (rowsOrOne: any | any[]) =>
    postInChunks("/tournaments", toArray(rowsOrOne)),

  teams: (rows: any[]) => postInChunks("/teams", rows),

  tournament_team: (rows: any[]) => postInChunks("/tournament-teams", rows),

  matches: (rows: any[]) => postInChunks("/matches", rows),

  insertAll: async (data: {
    tournament?: any | any[];
    teams?: any[];
    tournament_team?: any[];
    matches?: any[];
  }) => {
    // Order matters a bit: tournament -> teams -> join table -> matches
    const t = toArray(data.tournament);
    if (t.length) await generalApi.tournaments(t);
    if (data.teams?.length) await generalApi.teams(data.teams);
    if (data.tournament_team?.length)
      await generalApi.tournament_team(data.tournament_team);
    if (data.matches?.length) await generalApi.matches(data.matches);
  },
};
