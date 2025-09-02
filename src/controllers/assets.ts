// src/controllers/assets.ts
import axios from "axios";
import path from "path";
import { promises as fs } from "fs";
import type { Request, Response } from "express";

type Kind = "team" | "player";

type DownloadItem = {
  id: number | string; // Sofascore id
  slug: string; // filename base (we'll sanitize)
};

type Body = {
  type: Kind;
  items: DownloadItem[];
  // optional flags
  subdir?: string; // extra subfolder under kind (e.g. "premier-league-24")
  overwrite?: boolean; // default false (skip if exists)
  size?: number; // optional; appended as ?size=XX (if Sofascore supports)
};

const IMAGE_ROOT = process.env.IMAGE_DIR // e.g. "./public/images"
  ? path.resolve(process.cwd(), process.env.IMAGE_DIR)
  : path.resolve(process.cwd(), "public", "images");

function sanitizeName(s: string) {
  return String(s)
    .toLowerCase()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function extFromContentType(ct?: string | null) {
  if (!ct) return ".img";
  if (ct.includes("image/png")) return ".png";
  if (ct.includes("image/jpeg")) return ".jpg";
  if (ct.includes("image/webp")) return ".webp";
  if (ct.includes("image/svg")) return ".svg";
  return ".img";
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function fileExists(p: string) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

export async function downloadImages(req: Request, res: Response) {
  const { type, items, subdir, overwrite = false, size } = req.body as Body;

  if (
    (type !== "team" && type !== "player") ||
    !Array.isArray(items) ||
    items.length === 0
  ) {
    return res
      .status(400)
      .json({
        error: "Provide { type: 'team'|'player', items: [{id,slug},...] }",
      });
  }

  const baseDir = path.join(
    IMAGE_ROOT,
    type,
    subdir ? sanitizeName(subdir) : ""
  );
  await ensureDir(baseDir);

  // small worker pool
  const concurrency = 5;
  let index = 0;
  const results: Array<{
    id: number;
    slug: string;
    ok: boolean;
    path?: string;
    error?: string;
  }> = [];

  const worker = async () => {
    while (true) {
      const i = index++;
      if (i >= items.length) break;

      const raw = items[i];
      const id = Number(raw.id);
      const slug = sanitizeName(raw.slug || String(raw.id));
      if (!Number.isFinite(id) || !slug) {
        results[i] = { id, slug, ok: false, error: "Invalid id/slug" };
        continue;
      }

      const url =
        type === "team"
          ? `https://img.sofascore.com/api/v1/team/${id}/image${
              size ? `?size=${size}` : ""
            }`
          : `https://img.sofascore.com/api/v1/player/${id}/image${
              size ? `?size=${size}` : ""
            }`;

      try {
        const response = await axios.get<ArrayBuffer>(url, {
          responseType: "arraybuffer",
          validateStatus: () => true,
        });
        if (response.status !== 200) {
          results[i] = {
            id,
            slug,
            ok: false,
            error: `HTTP ${response.status}`,
          };
          continue;
        }

        const ext = extFromContentType(response.headers["content-type"]);
        const filename = `${slug}-${id}${ext}`;
        const outPath = path.join(baseDir, filename);

        if (!overwrite && (await fileExists(outPath))) {
          results[i] = { id, slug, ok: true, path: outPath }; // already exists
          continue;
        }

        await fs.writeFile(outPath, Buffer.from(response.data));
        results[i] = { id, slug, ok: true, path: outPath };
      } catch (e: any) {
        results[i] = { id, slug, ok: false, error: e?.message ?? String(e) };
      }
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, worker)
  );

  const ok = results.filter((r) => r.ok).length;
  res.json({
    saved: ok,
    total: items.length,
    dir: baseDir,
    results,
  });
}
