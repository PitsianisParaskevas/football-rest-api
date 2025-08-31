// src/middleware/auth.ts
import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";

const API_KEYS = new Set(
  (process.env.API_KEYS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
);

function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export const requireApiKey: RequestHandler = (req, res, next) => {
  const key =
    req.get("x-api-key") ||
    req.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!key) {
    res.status(401).json({ error: "Missing API key" });
    return; // <-- important: return void
  }

  for (const allowed of API_KEYS) {
    if (safeEqual(key, allowed)) {
      next();
      return; // <-- return after calling next
    }
  }

  res.status(401).json({ error: "Invalid API key" });
  return; // <-- return void
};

/** Apply auth only for write methods */
export const requireApiKeyForWrites: RequestHandler = (req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    // requireApiKey is also a RequestHandler returning void
    requireApiKey(req, res, next);
    return;
  }
  next();
  return;
};
