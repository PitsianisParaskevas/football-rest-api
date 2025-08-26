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

const router = Router();

router.get("/", getAllPlayerMarketValues);
router.get("/:id", getPlayerMarketValueById);
router.get("/player/:cust_id", getPlayerMarketValuesByPlayer);

router.post("/", createPlayerMarketValues); // create (single or bulk)
router.put("/:id", updatePlayerMarketValue); // update by ID
router.put("/by-key", updatePlayerMarketValueByKey); // update by UNIQUE key

router.delete("/:id", deletePlayerMarketValue);

export default router;
