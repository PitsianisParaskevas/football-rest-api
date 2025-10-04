import { Router } from "express";
import {
  getAllPlayers,
  createPlayer,
  updatePlayer,
  deletePlayer,
  getPlayerById,
  getAPlayer,
  getPlayersByTeam,
} from "../controllers/players";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

// Basic CRUD
router.get("/", asyncHandler(getAllPlayers));
router.post("/", asyncHandler(createPlayer));
router.put("/:id", requireApiKey, asyncHandler(updatePlayer));
router.delete("/:id", requireApiKey, asyncHandler(deletePlayer));
router.get("/:id", requireApiKey, asyncHandler(getPlayerById));

// Custom endpoints
router.get("/team/:team_cust_id", asyncHandler(getPlayersByTeam)); // Get player by slug + cust_id
router.get("/by-slug/:slug/:cust_id", asyncHandler(getAPlayer)); // Get players by cust_id

export default router;
