import { Router } from "express";
import {
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getATeam,
  getTeamStats,
  listTeamMatches,
  getTeamPlayerStats,
} from "../controllers/teams";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllTeams));

router.get("/:id/stats", asyncHandler(getTeamStats));

router.get("/:team_id/matches", listTeamMatches);

// routes/teams.ts
router.get("/:id/player_stats", asyncHandler(getTeamPlayerStats));

router.get("/:slug/:cust_id", getATeam);
router.post("/", requireApiKey, asyncHandler(createTeam));
router.put("/:id", requireApiKey, updateTeam);
router.delete("/:id", requireApiKey, deleteTeam);

export default router;
