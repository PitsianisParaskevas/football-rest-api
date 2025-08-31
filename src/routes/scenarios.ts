import { Router } from "express";
import {
  createScenario,
  deleteScenario,
  getAllScenarios,
  getScenarioById,
  updateScenario,
} from "../controllers/scenarios";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", asyncHandler(getAllScenarios));
router.get("/:id", requireApiKey, asyncHandler(getScenarioById));
router.post("/", asyncHandler(createScenario));
router.put("/:id", requireApiKey, asyncHandler(updateScenario));
router.delete("/:id", requireApiKey, asyncHandler(deleteScenario));

export default router;
