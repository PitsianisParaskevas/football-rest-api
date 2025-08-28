import { Router } from "express";
import {
  getAllMatchStats,
  getMatchStatsById,
  createMatchStats,
  updateMatchStats,
  deleteMatchStats,
} from "@/controllers/matchStats";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllMatchStats));
router.get("/:id", asyncHandler(getMatchStatsById));
router.post("/", asyncHandler(createMatchStats));
router.put("/:id", asyncHandler(updateMatchStats));
router.delete("/:id", asyncHandler(deleteMatchStats));

export default router;
