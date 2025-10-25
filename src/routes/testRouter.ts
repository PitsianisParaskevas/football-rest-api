import { Router } from "express";
import { asyncHandler } from "@/utils/asyncHandler";
import { getPlayersByCurrentTeam } from "@/functions/getPlayersByCurrentTeam";
import { getPlayerStatsGrouped } from "@/functions/getPlayerStatsGrouped";

const router = Router();

/**
 * ✅ GET /test/players/:teamId
 * Επιστρέφει όλους τους παίκτες με current_team_cust_id = :teamId
 */
router.get(
  "/getPlayersByCurrentTeam/:teamId",
  asyncHandler(async (req, res) => {
    const teamId = Number(req.params.teamId);
    if (!Number.isFinite(teamId)) {
      return res.status(400).json({ message: "Invalid team id" });
    }

    const players = await getPlayersByCurrentTeam(teamId);
    res.json({ teamId, count: players.length, players });
  })
);

router.get(
  "/getPlayerStatsGrouped/:playerCustId",
  asyncHandler(async (req, res) => {
    const playerCustId = Number(req.params.playerCustId);
    if (!Number.isFinite(playerCustId)) {
      return res.status(400).json({ message: "Invalid player_cust_id" });
    }
    // παράδειγμα με include ή exclude:
    // const stats = await getPlayerStatsGrouped(playerCustId, { includeKeys: ['totalPass','accuratePass'] });
    const stats = await getPlayerStatsGrouped(playerCustId);
    res.json({ playerCustId, stats });
  })
);

export default router;
