import { useState } from "react";
import LabeledInput from "../components/LabeledInput";
import ResultCodeSection from "../components/ResultCodeSection";
import { getMatchDayData, type MatchDayData } from "../functions";
import "../App.css";

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
];

const GetMatchDayData = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchDayData | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getMatchDayData(url);
      if (!data) {
        setError("❌ Could not fetch data. Make sure the URL is correct.");
      } else {
        console.log("data", data);
        setResult(data);
      }
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("❌ Something went wrong. Please try again.");
    }

    setLoading(false);
  };

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
