import { Router } from "express";
import {
  getAllMatchPlayerStats,
  getMatchPlayerStatsById,
  createMatchPlayerStats,
  updateMatchPlayerStats,
  deleteMatchPlayerStats,
} from "../controllers/matchPlayerStats";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerStats));
router.get("/:id", asyncHandler(getMatchPlayerStatsById));
router.post("/", asyncHandler(createMatchPlayerStats));
router.put("/:id", asyncHandler(updateMatchPlayerStats));
router.delete("/:id", asyncHandler(deleteMatchPlayerStats));

export default router;
