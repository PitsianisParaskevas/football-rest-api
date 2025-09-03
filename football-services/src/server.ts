// src/server.ts
import express from "express";
import axios from "axios";
import type { AxiosInstance, AxiosResponse } from "axios";
import cors from "cors";
import type { Request, Response } from "express";
import dotenv from "dotenv";
// If you’re not using cookie jar yet, you can remove these two:
import { CookieJar } from "tough-cookie";
import { wrapper } from "axios-cookiejar-support";

dotenv.config();

const app = express();
app.use(cors());

// ---------- Config ----------
const DEFAULT_HOST = "api.sofascore.com";
const FALLBACK_HOST = "www.sofascore.com";
const PRIMARY_HOST = process.env.SOFA_HOST?.trim() || DEFAULT_HOST;

// Simple in-memory cache (5 minutes)
const cache = new Map<string, { t: number; data: any }>();
const TTL_MS = 5 * 60 * 1000;

// Optional cookie jar (keeps us future-proof against 403s)
const jar = new CookieJar();
const http: AxiosInstance = wrapper(
  axios.create({
    timeout: 15000,
    decompress: true,
    withCredentials: true,
    jar,
  }) as any
);

// ---------- Helpers ----------
function buildApiUrl(host: string, restPath: string, query: string) {
  return `https://${host}/api/v1/${restPath}${query}`;
}

function browserHeaders(refererHost = "www.sofascore.com", refererPath = "/") {
  return {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    Accept: "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Sec-Fetch-Site": "cross-site",
    "Sec-Fetch-Mode": "cors",
    "Sec-Fetch-Dest": "empty",
    "sec-ch-ua":
      '"Chromium";v="126", "Not.A/Brand";v="24", "Google Chrome";v="126"',
    "sec-ch-ua-mobile": "?0",
    "sec-ch-ua-platform": '"Windows"',
    "X-Requested-With": "XMLHttpRequest",
    Referer: `https://${refererHost}${refererPath}`,
    Origin: `https://${refererHost}`,
    "Cache-Control": "no-cache",
    Pragma: "no-cache",
    Connection: "keep-alive",
  };
}

function deriveReferer(restPath: string) {
  const ev = restPath.match(/^event\/(\d+)/);
  if (ev) return { host: "www.sofascore.com", path: `/event/${ev[1]}` };
  return { host: "www.sofascore.com", path: "/" };
}

async function fetchUpstream(
  restPath: string,
  query: string
): Promise<{ response: AxiosResponse; finalHost: string }> {
  const { host: refHost, path: refPath } = deriveReferer(restPath);

  // Try primary host first
  let host = PRIMARY_HOST;
  let url = buildApiUrl(host, restPath, query);
  try {
    const response = await http.get(url, {
      headers: browserHeaders(refHost, refPath),
    });
    return { response, finalHost: host };
  } catch (e: any) {
    const status = e?.response?.status;

    // If 403, retry on fallback host
    if (status === 403 && host !== FALLBACK_HOST) {
      host = FALLBACK_HOST;
      url = buildApiUrl(host, restPath, query);
      const response = await http.get(url, {
        headers: browserHeaders(refHost, refPath),
      });
      return { response, finalHost: host };
    }
    throw e;
  }
}

// ---------- Logging ----------
app.use("/api/sofa", (req, res, next) => {
  console.log(`[sofa proxy IN]  ${req.method} ${req.originalUrl}`);
  res.on("finish", () => {
    console.log(`[sofa proxy OUT] ${res.statusCode} ${req.originalUrl}`);
  });
  next();
});

// ---------- Health ----------
app.get("/api/sofa/ping", async (_req: Request, res: Response) => {
  const cookies = await jar.getCookies("https://www.sofascore.com/").catch(() => []);
  res.json({
    ok: true,
    primaryHost: PRIMARY_HOST,
    fallbackHost: FALLBACK_HOST,
    cookieCount: cookies.length,
  });
});

// ---------- Main proxy (GET only) ----------
// IMPORTANT: no "/*" wildcard here; mount the handler and use req.path
app.use("/api/sofa", async (req: Request, res: Response) => {
  if (req.method !== "GET") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  // When mounted at "/api/sofa", req.path is e.g. "/unique-tournament/23/season/76457/standings"
  const restPath = req.path.replace(/^\/+/, "");
  if (!restPath) return res.status(400).json({ message: "Missing path" });

  const query = req.url.includes("?") ? req.url.slice(req.url.indexOf("?")) : "";

  // Cache by primary URL
  const primaryUrl = buildApiUrl(PRIMARY_HOST, restPath, query);
  const now = Date.now();
  const hit = cache.get(primaryUrl);
  if (hit && now - hit.t < TTL_MS) {
    return res.json(hit.data);
  }

  try {
    const { response, finalHost } = await fetchUpstream(restPath, query);
    cache.set(primaryUrl, { t: now, data: response.data });
    if (finalHost !== PRIMARY_HOST) {
      console.log(`ℹ️ Served via fallback host: ${finalHost}`);
    }
    res.status(response.status).json(response.data);
  } catch (e: any) {
    const status = e?.response?.status ?? 500;
    const data = e?.response?.data ?? { message: "Upstream error" };
    const errUrl = e?.config?.url || buildApiUrl(PRIMARY_HOST, restPath, query);
    console.error(`❌ Proxy failed [${status}] ${errUrl}`);
    try {
      console.error(
        typeof data === "string" ? data.slice(0, 500) : JSON.stringify(data).slice(0, 500)
      );
    } catch {}
    res.status(status).json(data);
  }
});

// ---------- Start ----------
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Proxy running at http://localhost:${PORT}`);
  console.log(`🔗 Test: http://localhost:${PORT}/api/sofa/ping`);
});
