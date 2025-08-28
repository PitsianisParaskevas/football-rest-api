import express from "express";
import dotenv from "dotenv";

// Route modules
import tournamentRoutes from "./routes/tournaments";
import teamRouters from "./routes/teams";
import tournamentTeamRoutes from "./routes/tournamentTeam";
import matchRoutes from "./routes/matches";
import scenarioRoutes from "./routes/scenarios";
import playerRoutes from "./routes/players";
import playerTeamHistoryRoutes from "./routes/playerTeamHistory";
import playerMarketValueRoutes from "./routes/playerMarketValue";
import metadataStatisticsRoutes from "@/routes/metadataStatistics";
import matchResultRoutes from "@/routes/matchResult";
import matchResultScenarioRoutes from "@/routes/matchResultScenarios";
import matchStatsRoutes from "@/routes/matchStats";
import matchIncidetnsRoutes from "@/routes/matchIncidetns";
import matchPlayerInfoRoutes from "@/routes/matchPlayerInfo";
import matchPlayerStatsRoutes from "@/routes/matchPlayerStats";
import matchPlayerShotRoutes from "@/routes/MatchPlayerShot";

import { errorHandler } from "./middlewares/errorHandler";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware to parse JSON
app.use(express.json());

// Register all routes
app.use("/tournaments", tournamentRoutes);
app.use("/teams", teamRouters);
app.use("/tournament-teams", tournamentTeamRoutes);
app.use("/matches", matchRoutes);
app.use("/scenarios", scenarioRoutes);
app.use("/players", playerRoutes);
app.use("/player-team-history", playerTeamHistoryRoutes);
app.use("/player-market-values", playerMarketValueRoutes);
app.use("/metadata-statistics", metadataStatisticsRoutes);
app.use("/match-results", matchResultRoutes);
app.use("/match-result-scenarios", matchResultScenarioRoutes);
app.use("/match-stats", matchStatsRoutes);
app.use("/match-incidents", matchIncidetnsRoutes);
app.use("/match-player-info", matchPlayerInfoRoutes);
app.use("/match-player-stats", matchPlayerStatsRoutes);
app.use("/match-player-shot", matchPlayerShotRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
