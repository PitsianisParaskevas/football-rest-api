import { Router } from "express";
import {
  getAllMetadataStatistics,
  getMetadataStatisticById,
  getMetadataStatisticByKey,
  getMetadataStatisticsByGroup,
  createMetadataStatistics,
  updateMetadataStatisticById,
  updateMetadataStatisticByKey,
  deleteMetadataStatisticById,
} from "@/controllers/metadataStatistics";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

/** Order matters: put specific prefixes before '/:id' */
router.get("/", getAllMetadataStatistics);
router.get("/:id", getMetadataStatisticById);
router.post("/", requireApiKey, createMetadataStatistics);
router.put("/by-key", requireApiKey, updateMetadataStatisticByKey);
router.put("/:id", requireApiKey, updateMetadataStatisticById);
router.delete("/:id", requireApiKey, deleteMetadataStatisticById);

router.get("/group/:group", getMetadataStatisticsByGroup);
router.get("/by-key/:key", getMetadataStatisticByKey);

export default router;
