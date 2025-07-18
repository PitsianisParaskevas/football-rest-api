import { getAllMatches } from "@/controllers/matches";
import { asyncHandler } from "@/utils/asyncHandler";
import { Router } from "express";

const router = Router();

router.get("/", asyncHandler(getAllMatches));

export default router;
