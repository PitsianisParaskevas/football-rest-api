import { Router } from "express";
import {
  createTeamToTournament,
  getAllTournamentTeams,
  removeTeamFromTournament,
  updateTeamToTournament,
} from "../controllers/tournamentTeam";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllTournamentTeams));
router.post("/", asyncHandler(createTeamToTournament));
router.put(
  "/:tournament_cust_id/:team_cust_id",
  asyncHandler(updateTeamToTournament)
);
router.delete(
  "/:tournament_cust_id/:team_cust_id",
  asyncHandler(removeTeamFromTournament)
);

export default router;
