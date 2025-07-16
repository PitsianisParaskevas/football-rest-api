import { Router } from "express";
import {
  createTournament,
  deleteTournament,
  getAllTournaments,
  getATournament,
  updateTournament,
} from "../controllers/tournaments";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllTournaments));
router.post("/", asyncHandler(createTournament));
router.put("/:id", asyncHandler(updateTournament));
router.delete("/:id", asyncHandler(deleteTournament));
router.get("/:slug/:cust_id", getATournament);

export default router;
