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

const router = Router();

// Basic CRUD
router.get("/", asyncHandler(getAllPlayers));
router.post("/", asyncHandler(createPlayer));
router.put("/:id", asyncHandler(updatePlayer));
router.delete("/:id", asyncHandler(deletePlayer));
router.get("/:id", asyncHandler(getPlayerById));

// Custom endpoints
router.get("/:slug/:cust_id", asyncHandler(getAPlayer)); // Get player by slug + cust_id
router.get("/:team/:cust_id", asyncHandler(getPlayersByTeam)); // Get players by team cust_id

export default router;
