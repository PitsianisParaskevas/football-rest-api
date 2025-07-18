import {
  createMatches,
  deleteMatch,
  getAllMatches,
  updateMatch,
} from "@/controllers/matches";
import { asyncHandler } from "@/utils/asyncHandler";
import { Router } from "express";

const router = Router();

router.get("/", asyncHandler(getAllMatches));
router.post("/", asyncHandler(createMatches));
router.put("/:match_id", asyncHandler(updateMatch));
router.delete("/:match_id", asyncHandler(deleteMatch));

export default router;
