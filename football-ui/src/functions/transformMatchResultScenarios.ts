import type { MatchIncidentRow } from "../types/MatchTables";
import { scenarioList } from "../utils/scenarioList";

export function transformMatchResultScenarios({
  match_id,
  home_team_id,
  away_team_id,
  incidents,
}: {
  match_id: number;
  home_team_id: number;
  away_team_id: number;
  incidents: MatchIncidentRow[];
}): {
  match_cust_id: number;
  team_cust_id: number;
  team_side: "home" | "away";
  scenario_id: number;
}[] {
  // Extract goal incidents with valid team_side
  const goals = incidents.filter(
    (i) =>
      i.incident_type === "goal" &&
      (i.team_side === "home" || i.team_side === "away")
  );

  const firstHalfGoals = goals.filter((g) => g.period?.toLowerCase() === "1st");
  const secondHalfGoals = goals.filter(
    (g) => g.period?.toLowerCase() === "2nd"
  );

  const homeGoals = goals.filter((g) => g.team_side === "home").length;
  const awayGoals = goals.filter((g) => g.team_side === "away").length;

  const firstHalfHomeGoals = firstHalfGoals.filter(
    (g) => g.team_side === "home"
  ).length;
  const firstHalfAwayGoals = firstHalfGoals.filter(
    (g) => g.team_side === "away"
  ).length;
  const secondHalfHomeGoals = secondHalfGoals.filter(
    (g) => g.team_side === "home"
  ).length;
  const secondHalfAwayGoals = secondHalfGoals.filter(
    (g) => g.team_side === "away"
  ).length;

  // Determine first goal
  const sortedGoals = [...goals].sort((a, b) => {
    const aTime = (a.time ?? 0) + (a.added_time ?? 0);
    const bTime = (b.time ?? 0) + (b.added_time ?? 0);
    return aTime - bTime;
  });

  const firstGoal = sortedGoals[0];
  const firstGoalTime = firstGoal?.time ?? 999;
  const firstTeamScored =
    firstGoal?.team_side === "home" || firstGoal?.team_side === "away"
      ? firstGoal.team_side
      : null;

  // Build context for evaluating scenarios
  const context = {
    homeGoals,
    awayGoals,
    firstHalfHomeGoals,
    firstHalfAwayGoals,
    secondHalfHomeGoals,
    secondHalfAwayGoals,
    firstGoalTime,
    firstTeamScored,
  };

  const results: {
    match_cust_id: number;
    team_cust_id: number;
    team_side: "home" | "away";
    scenario_id: number;
  }[] = [];

  for (const scenario of scenarioList()) {
    try {
      const fn = new Function(
        ...Object.keys(context),
        `return ${scenario.script}`
      );
      const isMatch = fn(...Object.values(context));

      if (isMatch) {
        if (scenario.team === "home" || scenario.team === "both") {
          results.push({
            match_cust_id: match_id,
            team_cust_id: home_team_id,
            team_side: "home",
            scenario_id: Number(scenario.id),
          });
        }
        if (scenario.team === "away" || scenario.team === "both") {
          results.push({
            match_cust_id: match_id,
            team_cust_id: away_team_id,
            team_side: "away",
            scenario_id: Number(scenario.id),
          });
        }
      }
    } catch (err) {
      console.warn(
        `❌ Error evaluating scenario ${scenario.id} - ${scenario.name}`,
        err
      );
    }
  }

  return results;
}
