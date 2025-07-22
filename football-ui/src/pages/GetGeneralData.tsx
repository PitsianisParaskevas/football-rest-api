// src/pages/GetGeneralData.tsx
import { useState } from "react";
import LabeledInput from "../components/LabeledInput";
import { getGeneralData, type GeneralData } from "../functions";
import ResultCodeSection from "../components/ResultCodeSection";
import "../App.css";

const GetGeneralData = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneralData | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await getGeneralData(url);
      if (!data) {
        setError("❌ Could not fetch data. Make sure the URL is correct.");
      } else {
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
      {loading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
        </div>
      )}

      <h2>🏆 Get General Data</h2>

      <LabeledInput
        title="Enter Sofascore Tournament URL"
        value={url}
        onChange={setUrl}
        onSubmit={handleSubmit}
        placeholder="/tournament/football/italy/serie-a/23#id:63515"
        buttonText={loading ? "Loading..." : "Fetch Data"}
      />

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {result && (
        <div className="result-row">
          <ResultCodeSection title="🏆 Tournament" data={result.tournament} />
          <ResultCodeSection title="👥 Teams" data={result.teams} />
          <ResultCodeSection
            title="🔗 Tournament Teams"
            data={result.tournament_team}
          />
          <ResultCodeSection title="🗓 Matches" data={result.matches} />
        </div>
      )}
    </div>
  );
};

export default GetGeneralData;
