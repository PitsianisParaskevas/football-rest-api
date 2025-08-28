import { Router } from "express";
import {
  getAllMatchIncidents,
  getMatchIncidentById,
  createMatchIncidents,
  updateMatchIncident,
  deleteMatchIncident,
} from "@/controllers/matchIncidents";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllMatchIncidents));
router.get("/:id", asyncHandler(getMatchIncidentById));
router.post("/", asyncHandler(createMatchIncidents)); // bulk or single
router.put("/:id", asyncHandler(updateMatchIncident)); // partial update
router.delete("/:id", asyncHandler(deleteMatchIncident));

export default router;
