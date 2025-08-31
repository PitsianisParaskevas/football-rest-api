import { Router } from "express";
import {
  getAllMatchPlayerInfo,
  getMatchPlayerInfoById,
  createMatchPlayerInfo,
  updateMatchPlayerInfo,
  deleteMatchPlayerInfo,
} from "@/controllers/matchPlayerInfo";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerInfo));
router.get("/:id", asyncHandler(getMatchPlayerInfoById));
router.post("/", requireApiKey, asyncHandler(createMatchPlayerInfo));
router.put("/:id", requireApiKey, asyncHandler(updateMatchPlayerInfo));
router.delete("/:id", requireApiKey, asyncHandler(deleteMatchPlayerInfo));

export default router;
