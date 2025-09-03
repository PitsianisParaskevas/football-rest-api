import { Router } from "express";
import { getStandingsAllScopes } from "@/controllers/standings";
import { asyncHandler } from "@/utils/asyncHandler";

const router = Router();

router.get("/:cust_id", asyncHandler(getStandingsAllScopes));

export default router;
