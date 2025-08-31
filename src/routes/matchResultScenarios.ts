import { Router } from "express";
import {
  listAll,
  listByMatch,
  getById,
  createMany,
  updateById,
  deleteById,
} from "@/controllers/matchResultScenarios";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

// Collections
router.get("/", listAll);

router.get("/:id", getById);
router.post("/", requireApiKey, createMany);
router.put("/:id", requireApiKey, updateById);
router.delete("/:id", requireApiKey, deleteById);

router.get("/by-match/:match_cust_id", listByMatch);

export default router;
