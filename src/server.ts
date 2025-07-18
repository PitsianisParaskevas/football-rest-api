import express from "express";
import dotenv from "dotenv";

// Route modules
import tournamentRoutes from "./routes/tournaments";
import teamsRouters from "./routes/teams";
import tournamentTeamRoutes from "./routes/tournamentTeam";
import { errorHandler } from "./middlewares/errorHandler";

// Load environment variables form .env
dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Middleware to parse JSON
app.use(express.json());

// Register all routes
app.use("/tournaments", tournamentRoutes);
app.use("/teams", teamsRouters);
app.use("/tournament-teams", tournamentTeamRoutes);

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "OK" });
});

app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});
