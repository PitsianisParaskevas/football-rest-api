import { Router } from "express";
import {
  getAllMatchStats,
  getMatchStatsById,
  createMatchStats,
  updateMatchStats,
  deleteMatchStats,
} from "@/controllers/matchStats";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllMatchStats));
router.get("/:id", asyncHandler(getMatchStatsById));
router.post("/", requireApiKey, asyncHandler(createMatchStats));
router.put("/:id", requireApiKey, asyncHandler(updateMatchStats));
router.delete("/:id", requireApiKey, asyncHandler(deleteMatchStats));

export default router;
