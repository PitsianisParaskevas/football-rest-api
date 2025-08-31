import { Router } from "express";
import {
  createTeamToTournament,
  getAllTournamentTeams,
  removeTeamFromTournament,
  updateTeamToTournament,
} from "../controllers/tournamentTeam";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllTournamentTeams));
router.post("/", requireApiKey, asyncHandler(createTeamToTournament));
router.put(
  "/:tournament_cust_id/:team_cust_id",
  requireApiKey,
  asyncHandler(updateTeamToTournament)
);
router.delete(
  "/:tournament_cust_id/:team_cust_id",
  requireApiKey,
  asyncHandler(removeTeamFromTournament)
);

export default router;
