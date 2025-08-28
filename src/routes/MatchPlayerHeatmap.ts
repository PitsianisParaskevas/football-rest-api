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

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerHeatmaps));
router.get("/:id", asyncHandler(getMatchPlayerHeatmapById));
router.post("/", asyncHandler(createMatchPlayerHeatmaps));
router.put("/:id", asyncHandler(updateMatchPlayerHeatmap));
router.delete("/:id", asyncHandler(deleteMatchPlayerHeatmap));

export default router;
