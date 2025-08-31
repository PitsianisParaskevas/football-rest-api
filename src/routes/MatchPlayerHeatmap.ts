// src/routes/matchPlayerHeatmap.ts
import { Router } from "express";
import {
  getAllMatchPlayerHeatmaps,
  getMatchPlayerHeatmapById,
  createMatchPlayerHeatmaps,
  updateMatchPlayerHeatmap,
  deleteMatchPlayerHeatmap,
} from "../controllers/MatchPlayerHeatmap";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerHeatmaps));
router.get("/:id", asyncHandler(getMatchPlayerHeatmapById));
router.post("/", requireApiKey, asyncHandler(createMatchPlayerHeatmaps));
router.put("/:id", requireApiKey, asyncHandler(updateMatchPlayerHeatmap));
router.delete("/:id", requireApiKey, asyncHandler(deleteMatchPlayerHeatmap));

export default router;
