import { useState } from "react";
import LabeledInput from "../components/LabeledInput";
import { getGeneralData } from "../functions";
import ResultCodeSection from "../components/ResultCodeSection";
import "../App.css";
import type { GeneralData } from "../types/GeneralData";

// NEW
import { generalApi } from "../services/apiGeneralData";

const GetGeneralData = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<GeneralData | null>(null);

  // insert UI state
  const [inserting, setInserting] = useState<string | null>(null);
  const [insertMsg, setInsertMsg] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setInsertMsg(null);

    try {
      const data = await getGeneralData(url);
      if (!data)
        setError("❌ Could not fetch data. Make sure the URL is correct.");
      else setResult(data);
    } catch (err) {
      console.error("Unexpected error:", err);
      setError("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  async function runInsert(label: string, fn: () => Promise<any>) {
    try {
      setInserting(label);
      setInsertMsg(null);
      await fn();
      setInsertMsg(`✅ ${label} inserted.`);
    } catch (e: any) {
      setInsertMsg(`❌ ${label} failed: ${e?.message ?? e}`);
    } finally {
      setInserting(null);
    }
  }

  const handleInsertAll = () =>
    result && runInsert("All general data", () => generalApi.insertAll(result));

  const handleInsertTournament = () =>
    result &&
    runInsert("Tournament", () => generalApi.tournaments(result.tournament));
  const handleInsertTeams = () =>
    result && runInsert("Teams", () => generalApi.teams(result.teams || []));
  const handleInsertTournamentTeams = () =>
    result &&
    runInsert("Tournament teams", () =>
      generalApi.tournament_team(result.tournament_team || [])
    );
  const handleInsertMatches = () =>
    result &&
    runInsert("Matches", () => generalApi.matches(result.matches || []));

  const tournamentCount = result?.tournament ? 1 : 0;

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

      {result && (
        <button
          onClick={() => {
            setResult(null);
            setUrl("");
            setInsertMsg(null);
          }}
          style={{ marginTop: "1rem", marginBottom: "1rem" }}
        >
          🔄 Clear Results
        </button>
      )}

      {error && <p style={{ color: "red", marginTop: "1rem" }}>{error}</p>}

      {/* Insert controls */}
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
              {inserting === "All general data" ? "Inserting…" : "Insert Data"}
            </button>

            <button
              onClick={handleInsertTournament}
              disabled={!!inserting || !tournamentCount}
              title={tournamentCount ? `Insert 1 tournament row` : "No data"}
            >
              {inserting === "Tournament"
                ? "Inserting…"
                : `Insert 🏆 Tournament (${tournamentCount})`}
            </button>

            <button
              onClick={handleInsertTeams}
              disabled={!!inserting || !result.teams?.length}
              title={
                result.teams?.length
                  ? `Insert ${result.teams.length} team row(s)`
                  : "No data"
              }
            >
              {inserting === "Teams"
                ? "Inserting…"
                : `Insert 👥 Teams (${result.teams?.length ?? 0})`}
            </button>

            <button
              onClick={handleInsertTournamentTeams}
              disabled={!!inserting || !result.tournament_team?.length}
              title={
                result.tournament_team?.length
                  ? `Insert ${result.tournament_team.length} row(s)`
                  : "No data"
              }
            >
              {inserting === "Tournament teams"
                ? "Inserting…"
                : `Insert 🔗 Tournament Teams (${
                    result.tournament_team?.length ?? 0
                  })`}
            </button>

            <button
              onClick={handleInsertMatches}
              disabled={!!inserting || !result.matches?.length}
              title={
                result.matches?.length
                  ? `Insert ${result.matches.length} match row(s)`
                  : "No data"
              }
            >
              {inserting === "Matches"
                ? "Inserting…"
                : `Insert 🗓 Matches (${result.matches?.length ?? 0})`}
            </button>
          </div>

          {insertMsg && <div style={{ marginTop: 8 }}>{insertMsg}</div>}
        </div>
      )}

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
