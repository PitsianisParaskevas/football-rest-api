// src/routes/matchStats.ts
import { Router } from "express";
import {
  getAllMatchStats,
  getByIDMatchStats,
  createMatchStats,
  editeMatchStats,
  deleteMatchStats,
} from "../controllers/matchStats";

const router = Router();

router.get("/", getAllMatchStats);
router.get("/:match_cust_id/:team_cust_id/:stat_key/:phase", getByIDMatchStats);
router.post("/", createMatchStats);
router.put("/:match_cust_id/:team_cust_id/:stat_key/:phase", editeMatchStats);
router.delete(
  "/:match_cust_id/:team_cust_id/:stat_key/:phase",
  deleteMatchStats
);

export default router;
