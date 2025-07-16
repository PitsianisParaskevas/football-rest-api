import { Router } from "express";
import {
  getAllTeams,
  createTeam,
  updateTeam,
  deleteTeam,
  getATeam,
} from "../controllers/teams";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllTeams));
router.post("/", asyncHandler(createTeam));
router.put("/:id", updateTeam);
router.delete("/:id", deleteTeam);
router.get("/:slug/:cust_id", getATeam);

export default router;
