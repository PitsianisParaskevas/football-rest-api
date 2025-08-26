import { Router } from "express";
import {
  listAll,
  listByMatch,
  getById,
  createMany,
  updateById,
  deleteById,
} from "@/controllers/matchResultScenarios";

const router = Router();

// Collections
router.get("/", listAll);
router.get("/by-match/:match_cust_id", listByMatch);

// Single by id
router.get("/:id", getById);

// Create (single or bulk)
router.post("/", createMany);

// Update by id (change scenario_id)
router.put("/:id", updateById);

// Delete by id
router.delete("/:id", deleteById);

export default router;
