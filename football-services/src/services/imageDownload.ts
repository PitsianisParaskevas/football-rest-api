// src/services/imageDownload.ts
import axios from "axios";

const http = axios.create({
  baseURL: "/api", // Vite proxy -> http://localhost:3000
});

http.interceptors.request.use((cfg) => {
  const key = import.meta.env.VITE_API_KEY;
  if (key) cfg.headers["x-api-key"] = key;
  return cfg;
});

type Kind = "team" | "player";
type Item = { id: number | string; slug: string };

export async function downloadTeamImages(
  items: Item[],
  opts?: { overwrite?: boolean; subdir?: string; size?: number }
) {
  const { data } = await http.post("/assets/images", {
    type: "team",
    items,
    ...opts,
  });
  return data;
}

export async function downloadPlayerImages(
  items: Item[],
  opts?: { overwrite?: boolean; subdir?: string; size?: number }
) {
  const { data } = await http.post("/assets/images", {
    type: "player",
    items,
    ...opts,
  });
  return data;
}
