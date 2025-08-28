import { Router } from "express";
import {
  getAllMatchPlayerInfo,
  getMatchPlayerInfoById,
  createMatchPlayerInfo,
  updateMatchPlayerInfo,
  deleteMatchPlayerInfo,
} from "@/controllers/matchPlayerInfo";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllMatchPlayerInfo));
router.get("/:id", asyncHandler(getMatchPlayerInfoById));
router.post("/", asyncHandler(createMatchPlayerInfo));
router.put("/:id", asyncHandler(updateMatchPlayerInfo));
router.delete("/:id", asyncHandler(deleteMatchPlayerInfo));

export default router;
