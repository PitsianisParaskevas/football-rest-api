// scripts/downloadBadges.ts

import { downloadTeamBadge } from "@/utils/badgeUtils";
import { runScheduleFetch } from "./schedule";

(async () => {
  const fullSchedule = await runScheduleFetch(
    "https://www.sofascore.com/tournament/football/germany/bundesliga/35#id:63516"
  );
  const teams = fullSchedule?.leagueData?.teams.map((t: any) => ({
    id: t.cust_id,
    slug: t.slug,
  }));

  for (const team of teams) {
    try {
      await downloadTeamBadge(team);
    } catch (err) {
      console.error(`❌ ${team.slug} failed:`, err);
    }
  }
})();
