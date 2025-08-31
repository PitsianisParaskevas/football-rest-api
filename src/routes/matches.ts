import {
  createMatches,
  deleteMatch,
  getAllMatches,
  getMatches,
  searchMatches,
  updateMatch,
} from "@/controllers/matches";
import { requireApiKey } from "@/middleware/auth";
import { asyncHandler } from "@/utils/asyncHandler";
import { Router } from "express";

const router = Router();

router.get("/", asyncHandler(getAllMatches));
router.post("/", requireApiKey, asyncHandler(createMatches));
router.put("/:match_id", requireApiKey, asyncHandler(updateMatch));
router.delete("/:match_id", requireApiKey, asyncHandler(deleteMatch));

router.get("/", asyncHandler(getMatches));
router.post("/search", asyncHandler(searchMatches)); // POST search (arrays / pairs)

export default router;
