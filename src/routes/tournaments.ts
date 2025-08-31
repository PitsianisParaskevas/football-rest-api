import { Router } from "express";
import {
  createTournament,
  deleteTournament,
  getAllTournaments,
  getATournament,
  updateTournament,
} from "../controllers/tournaments";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllTournaments));
router.post("/", requireApiKey, asyncHandler(createTournament));
router.put("/:id", requireApiKey, asyncHandler(updateTournament));
router.delete("/:id", requireApiKey, asyncHandler(deleteTournament));

// Extra
router.get("/:slug/:cust_id", requireApiKey, getATournament);

export default router;
