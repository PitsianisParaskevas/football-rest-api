import { Router } from "express";
import {
  createScenario,
  deleteScenario,
  getAllScenarios,
  getScenarioById,
  updateScenario,
} from "../controllers/scenarios";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(getAllScenarios));
router.post("/", asyncHandler(createScenario));
router.put("/:id", asyncHandler(updateScenario));
router.delete("/:id", asyncHandler(deleteScenario));
router.get("/:id", asyncHandler(getScenarioById)); // 👈 Now using scenario_id

export default router;
