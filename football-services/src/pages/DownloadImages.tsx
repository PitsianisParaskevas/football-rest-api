// src/pages/DownloadImages.tsx
import { useMemo, useState } from "react";
import "../App.css";
import {
  downloadTeamImages,
  downloadPlayerImages,
} from "../services/imageDownload";

// Keep ids numeric everywhere
type Item = { id: number; slug: string };

function normalizeSlug(s: string): string {
  // filesystem-friendly slug
  return s
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-_]/g, "");
}

/**
 * Accepts lines like:
 *   14, juventus
 *   juventus, 14
 *   843754, Marcus Rashford
 *   843754, marcus-rashford
 *
 * Returns Item[] with numeric id and a cleaned slug.
 */
function parseLinesToItems(text: string): Item[] {
  return text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((line) => {
      // split on comma OR tabs; allow extra spaces
      const parts = line.split(/[,\t]/).map((s) => s.trim()).filter(Boolean);
      if (parts.length < 2) return null;

      const a = parts[0];
      const b = parts[1];

      const aNum = Number(a);
      const bNum = Number(b);

      // If first token is a number, treat it as id and second as slug
      if (Number.isFinite(aNum) && aNum > 0) {
        const slug = normalizeSlug(b);
        if (!slug) return null;
        return { id: aNum, slug };
      }

      // If second token is a number, treat it as id and first as slug
      if (Number.isFinite(bNum) && bNum > 0) {
        const slug = normalizeSlug(a);
        if (!slug) return null;
        return { id: bNum, slug };
      }

      // Neither side is a valid numeric id -> skip line
      return null;
    })
    // type-guard: (Item | null)[] -> Item[]
    .filter((x): x is Item => x !== null);
}

export default function DownloadImages() {
  const [input, setInput] = useState<string>("");
  const [downloading, setDownloading] = useState<null | "teams" | "players">(null);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const items = useMemo(() => parseLinesToItems(input), [input]);

  async function runDownload(kind: "teams" | "players") {
    setError(null);
    setNote(null);

    if (!items.length) {
      setError("Please provide at least one line with an id and a slug.");
      return;
    }

    setDownloading(kind);
    try {
      if (kind === "teams") {
        await downloadTeamImages(items);
        setNote(`✅ Downloaded ${items.length} team image(s) into a ZIP.`);
      } else {
        await downloadPlayerImages(items);
        setNote(`✅ Downloaded ${items.length} player image(s) into a ZIP.`);
      }
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setDownloading(null);
    }
  }

  return (
    <div>
      <h2>🖼️ Download Images (Teams / Players)</h2>

      <p style={{ marginTop: 6 }}>
        Paste one entry per line as <code>id, slug</code> (order doesn’t matter).
      </p>

      <div style={{ display: "grid", gap: 8, maxWidth: 680 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Examples:\n14, Juventus\nJuventus, 14\n843754, Marcus Rashford`}
          rows={10}
          style={{ width: "100%", fontFamily: "monospace" }}
        />

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => runDownload("teams")}
            disabled={downloading !== null}
          >
            {downloading === "teams" ? "Downloading…" : "Download Team Images (ZIP)"}
          </button>

          <button
            onClick={() => runDownload("players")}
            disabled={downloading !== null}
          >
            {downloading === "players" ? "Downloading…" : "Download Player Images (ZIP)"}
          </button>

          <span style={{ fontSize: 12, color: "#666" }}>
            Parsed items: {items.length}
          </span>
        </div>

        {note && <div style={{ color: "green" }}>{note}</div>}
        {error && <div style={{ color: "red" }}>{error}</div>}

        {items.length > 0 && (
          <details style={{ marginTop: 8 }}>
            <summary>Preview parsed items</summary>
            <pre style={{ background: "#f7f7f7", padding: 8, borderRadius: 6 }}>
{JSON.stringify(items, null, 2)}
            </pre>
          </details>
        )}
      </div>
    </div>
  );
}
