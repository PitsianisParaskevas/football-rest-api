import { Router } from "express";
import {
  getAllPlayerMarketValues,
  getPlayerMarketValueById,
  getPlayerMarketValuesByPlayer,
  createPlayerMarketValues,
  updatePlayerMarketValue,
  updatePlayerMarketValueByKey,
  deletePlayerMarketValue,
} from "@/controllers/playerMarketValue";
import { requireApiKey } from "@/middleware/auth";

const router = Router();

router.get("/", getAllPlayerMarketValues);
router.get("/:id", getPlayerMarketValueById);
router.post("/", requireApiKey, createPlayerMarketValues); // create (single or bulk)
router.put("/:id", requireApiKey, updatePlayerMarketValue); // update by ID
router.put("/by-key", requireApiKey, updatePlayerMarketValueByKey); // update by UNIQUE key
router.delete("/:id", requireApiKey, deletePlayerMarketValue);

router.get("/player/:cust_id", getPlayerMarketValuesByPlayer);

export default router;
