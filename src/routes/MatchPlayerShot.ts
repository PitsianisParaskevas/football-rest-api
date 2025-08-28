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

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerShots));
router.get("/:id", asyncHandler(getMatchPlayerShotById));
router.post("/", asyncHandler(createMatchPlayerShots));
router.put("/:id", asyncHandler(updateMatchPlayerShot));
router.delete("/:id", asyncHandler(deleteMatchPlayerShot));

export default router;
