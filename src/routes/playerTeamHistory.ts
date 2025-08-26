import { Router } from "express";
import {
  getAllPlayerTeamHistory,
  getPlayerTeamHistoryById,
  createPlayerTeamHistory,
  updatePlayerTeamHistory,
  deletePlayerTeamHistory,
} from "@/controllers/playerTeamHistory";

const router = Router();

// map verbs, don't use router.use for handlers
router.get("/", getAllPlayerTeamHistory);
router.get("/:id", getPlayerTeamHistoryById);
router.post("/", createPlayerTeamHistory);
router.put("/:id", updatePlayerTeamHistory);
router.delete("/:id", deletePlayerTeamHistory);

export default router;
