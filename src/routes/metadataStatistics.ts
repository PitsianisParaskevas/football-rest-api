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

const router = Router();

/** Order matters: put specific prefixes before '/:id' */
router.get("/", getAllMetadataStatistics);
router.get("/group/:group", getMetadataStatisticsByGroup);
router.get("/by-key/:key", getMetadataStatisticByKey);
router.get("/:id", getMetadataStatisticById);

router.post("/", createMetadataStatistics);
router.put("/by-key", updateMetadataStatisticByKey);
router.put("/:id", updateMetadataStatisticById);

router.delete("/:id", deleteMetadataStatisticById);

export default router;
