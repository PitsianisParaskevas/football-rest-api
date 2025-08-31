import { Router } from "express";
import {
  listMatchResults,
  getMatchResultByCustId,
  createMatchResults,
  updateMatchResult,
  deleteMatchResult,
} from "@/controllers/matchResult";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

// CRUD (using match_cust_id as the identifier)
router.get("/", listMatchResults);
router.post("/", requireApiKey, createMatchResults);
router.put("/:match_cust_id", requireApiKey, updateMatchResult);
router.delete("/:match_cust_id", requireApiKey, deleteMatchResult);

router.get("/:match_cust_id", getMatchResultByCustId);

export default router;
