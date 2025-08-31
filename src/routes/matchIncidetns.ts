import { Router } from "express";
import {
  getAllMatchIncidents,
  getMatchIncidentById,
  createMatchIncidents,
  updateMatchIncident,
  deleteMatchIncident,
} from "@/controllers/matchIncidents";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllMatchIncidents));
router.get("/:id", asyncHandler(getMatchIncidentById));
router.post("/", requireApiKey, asyncHandler(createMatchIncidents)); // bulk or single
router.put("/:id", requireApiKey, asyncHandler(updateMatchIncident)); // partial update
router.delete("/:id", requireApiKey, asyncHandler(deleteMatchIncident));

export default router;
