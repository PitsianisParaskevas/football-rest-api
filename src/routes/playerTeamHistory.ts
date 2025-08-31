import { Router } from "express";
import {
  getAllPlayerTeamHistory,
  getPlayerTeamHistoryById,
  createPlayerTeamHistory,
  updatePlayerTeamHistory,
  deletePlayerTeamHistory,
} from "@/controllers/playerTeamHistory";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

// map verbs, don't use router.use for handlers
router.get("/", getAllPlayerTeamHistory);
router.get("/:id", getPlayerTeamHistoryById);
router.post("/", requireApiKey, createPlayerTeamHistory);
router.put("/:id", requireApiKey, updatePlayerTeamHistory);
router.delete("/:id", requireApiKey, deletePlayerTeamHistory);

export default router;
