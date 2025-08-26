import { Router } from "express";
import {
  listMatchResults,
  getMatchResultByCustId,
  createMatchResults,
  updateMatchResult,
  deleteMatchResult,
} from "@/controllers/matchResult";

const router = Router();

// CRUD (using match_cust_id as the identifier)
router.get("/", listMatchResults);
router.get("/:match_cust_id", getMatchResultByCustId);
router.post("/", createMatchResults);
router.put("/:match_cust_id", updateMatchResult);
router.delete("/:match_cust_id", deleteMatchResult);

export default router;
