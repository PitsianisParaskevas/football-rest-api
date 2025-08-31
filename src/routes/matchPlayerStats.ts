import { Router } from "express";
import {
  getAllMatchPlayerStats,
  getMatchPlayerStatsById,
  createMatchPlayerStats,
  updateMatchPlayerStats,
  deleteMatchPlayerStats,
} from "../controllers/matchPlayerStats";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerStats));
router.get("/:id", asyncHandler(getMatchPlayerStatsById));
router.post("/", requireApiKey, asyncHandler(createMatchPlayerStats));
router.put("/:id", requireApiKey, asyncHandler(updateMatchPlayerStats));
router.delete("/:id", requireApiKey, asyncHandler(deleteMatchPlayerStats));

export default router;
