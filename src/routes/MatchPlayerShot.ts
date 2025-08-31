// src/routes/matchPlayerShot.ts
import { Router } from "express";
import {
  getAllMatchPlayerShots,
  getMatchPlayerShotById,
  createMatchPlayerShots,
  updateMatchPlayerShot,
  deleteMatchPlayerShot,
} from "../controllers/MatchPlayerShot";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerShots));
router.get("/:id", asyncHandler(getMatchPlayerShotById));
router.post("/", requireApiKey, asyncHandler(createMatchPlayerShots));
router.put("/:id", requireApiKey, asyncHandler(updateMatchPlayerShot));
router.delete("/:id", requireApiKey, asyncHandler(deleteMatchPlayerShot));

export default router;
