import express from "express";
import dotenv from "dotenv";
import path from "path";
import cors from "cors";

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
import matchPlayerHeatmapRoutes from "@/routes/MatchPlayerHeatmap";
import standingsRoutes from "@/routes/standings";
import assetRoutes from "@/routes/assets";
import testRoutes from "@/routes/testRouter";
import { errorHandler } from "./middlewares/errorHandler";

// Load environment variables from .env
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN;

/** ----- Middleware (order matters) ----- */
app.use(
  cors({
    origin: FRONTEND_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

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
app.use("/match-player-heatmap", matchPlayerHeatmapRoutes);
app.use("/assets", assetRoutes);
app.use("/standings", standingsRoutes);

app.use("/testRoutes", testRoutes);

app.use(
  "/static",
  express.static(path.resolve(process.cwd(), "public")) // so files show at /static/images/...
);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

/** ----- 404 (optional) ----- */
app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

/** ----- Error handler LAST ----- */
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
