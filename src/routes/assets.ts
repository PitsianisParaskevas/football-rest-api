// src/routes/assets.ts
import { Router } from "express";
import { downloadImages } from "@/controllers/assets";
import { asyncHandler } from "@/utils/asyncHandler";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

// protect with API key
router.post("/images", requireApiKey, asyncHandler(downloadImages));

export default router;
