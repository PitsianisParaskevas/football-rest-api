import { useState } from "react";
import LabeledInput from "../components/LabeledInput";
import ResultCodeSection from "../components/ResultCodeSection";
import { getMatchDayData } from "../functions";
import "../App.css";
import type { MatchDayData } from "../types/MatchDayData";

// your existing API module
import { matchDayApi } from "../services/apiMatchDay";

const sections = [
  { key: "players", title: "👤 Players" },
  { key: "metadata_statistics", title: "🧩 Metadata Statistic" },
  { key: "match_result", title: "📄 Match Result" },
  { key: "match_stats", title: "📊 Match Stats" },
  { key: "match_player_info", title: "📋 Match Player Info" },
  { key: "match_player_stats", title: "📈 Player Stats" },
  { key: "match_player_shot", title: "🎯 Player Shot Map" },
  { key: "match_player_heatmap", title: "🔥 Player Heatmap" },
  { key: "match_incident", title: "⚠️ Match Incidents" },
  { key: "match_result_scenarios", title: "🧠 Result Scenarios" },
] as const;

type SectionKey = (typeof sections)[number]["key"];

// tell TS that api has a function for every section key
const sectionApi = matchDayApi as Record<SectionKey, (rows: any[]) => Promise<any>>;

const GetMatchDayData = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchDayData | null>(null);

  // insert UI state
  const [inserting, setInserting] = useState<string | null>(null);
  const [insertMsg, setInsertMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setInsertMsg(null);

    try {
      const data = await getMatchDayData(url);
      if (!data) {
        setError("❌ Could not fetch data. Make sure the URL is correct.");
      } else {
        setResult(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // one-click insert for all sections
  async function handleInsertAll() {
    if (!result) return;
    try {
      setInserting("All");
      setInsertMsg(null);
      await matchDayApi.insertAll(result as any);
      setInsertMsg("✅ All sections inserted.");
    } catch (e: any) {
      setInsertMsg(`❌ Insert all failed: ${e?.message ?? e}`);
    } finally {
      setInserting(null);
    }
  }

  // per-section insert (typed, no ts-ignore)
  async function handleInsertOne(key: SectionKey, title: string) {
    if (!result) return;
    const rows = (result as any)[key];
    if (!Array.isArray(rows) || rows.length === 0) return;

    try {
      setInserting(title);
      setInsertMsg(null);
      await sectionApi[key](rows);
      setInsertMsg(`✅ ${title} inserted.`);
    } catch (e: any) {
      setInsertMsg(`❌ ${title} failed: ${e?.message ?? e}`);
    } finally {
      setInserting(null);
    }
  }

  return (
    <div>
      <h2>📅 Get Match Day Data</h2>

      <LabeledInput
        title="Enter Sofascore MatchDay URL"
        value={url}
        onChange={setUrl}
        onSubmit={handleSubmit}
        placeholder="/football/match/como-inter/Xdbseeb#id:12501501"
        buttonText={loading ? "Loading..." : "Fetch Data"}
      />

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {/* Insert controls – only after data */}
      {result && (
        <div
          style={{
            margin: "12px 0",
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
          }}
        >
          <b>Insert</b>
          <div
            style={{ marginTop: 8, display: "flex", gap: 8, flexWrap: "wrap" }}
          >
            <button onClick={handleInsertAll} disabled={!!inserting}>
              {inserting === "All" ? "Inserting…" : "Insert Data"}
            </button>

            {/* granular buttons */}
            {sections.map(({ key, title }) => {
              const rows = (result as any)[key];
              const count = Array.isArray(rows) ? rows.length : 0;
              return (
                <button
                  key={key}
                  disabled={!!inserting || !count}
                  onClick={() => handleInsertOne(key, title)}
                  title={count ? `Insert ${count} row(s)` : "No data"}
                >
                  {inserting === title
                    ? "Inserting…"
                    : `Insert ${title} ${count ? `(${count})` : ""}`}
                </button>
              );
            })}
          </div>
          {insertMsg && <div style={{ marginTop: 8 }}>{insertMsg}</div>}
        </div>
      )}

      {result && (
        <div className="result-row">
          {sections.map(({ key, title }) => (
            <ResultCodeSection
              key={key}
              title={title}
              data={(result as any)[key]}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default GetMatchDayData;
