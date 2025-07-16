// src/utils/scenario.util.ts

/**
 * Defines a single scenario for match evaluation.
 */
export interface Scenario {
  id: string;
  name: string;
  team: "home" | "away" | "both";
  category: string;
  script: string;
}

/**
 * Returns the full list of predefined match scenarios.
 */
export function getScenarioList(): Scenario[] {
  return [
    {
      id: "1",
      name: "First goal in 1st half by home",
      team: "home",
      category: "First Goal",
      script: "firstGoalTime <= 45 && firstTeamScored === 'home'",
    },
    {
      id: "2",
      name: "First goal in 1st half by away",
      team: "away",
      category: "First Goal",
      script: "firstGoalTime <= 45 && firstTeamScored === 'away'",
    },
    {
      id: "3",
      name: "Home scored in 1st half",
      team: "home",
      category: "Halftime Analysis",
      script: "firstHalfHomeGoals > 0",
    },
    {
      id: "4",
      name: "Away scored in 1st half",
      team: "away",
      category: "Halftime Analysis",
      script: "firstHalfAwayGoals > 0",
    },
    {
      id: "5",
      name: "Both teams scored in first half",
      team: "both",
      category: "Halftime Analysis",
      script: "firstHalfHomeGoals > 0 && firstHalfAwayGoals > 0",
    },
    {
      id: "6",
      name: "Home leads at halftime",
      team: "home",
      category: "Halftime Analysis",
      script: "firstHalfHomeGoals > firstHalfAwayGoals",
    },
    {
      id: "7",
      name: "Away leads at halftime",
      team: "away",
      category: "Halftime Analysis",
      script: "firstHalfAwayGoals > firstHalfHomeGoals",
    },
    {
      id: "8",
      name: "No goals in 1st half",
      team: "both",
      category: "Halftime Analysis",
      script: "firstHalfHomeGoals + firstHalfAwayGoals === 0",
    },
    {
      id: "10",
      name: "First goal in 2nd half by home",
      team: "home",
      category: "First Goal",
      script: "firstGoalTime > 45 && firstTeamScored === 'home'",
    },
    {
      id: "11",
      name: "First goal in 2nd half by away",
      team: "away",
      category: "First Goal",
      script: "firstGoalTime > 45 && firstTeamScored === 'away'",
    },
    {
      id: "12",
      name: "Both teams scored in second half",
      team: "both",
      category: "Second Half",
      script: "secondHalfHomeGoals > 0 && secondHalfAwayGoals > 0",
    },
    {
      id: "13",
      name: "Home scored in 2nd half",
      team: "home",
      category: "Second Half",
      script: "secondHalfHomeGoals > 0",
    },
    {
      id: "14",
      name: "Away scored in 2nd half",
      team: "away",
      category: "Second Half",
      script: "secondHalfAwayGoals > 0",
    },
    {
      id: "15",
      name: "Home scores first",
      team: "home",
      category: "First Goal",
      script: "firstTeamScored === 'home'",
    },
    {
      id: "16",
      name: "Away scores first",
      team: "away",
      category: "First Goal",
      script: "firstTeamScored === 'away'",
    },
    {
      id: "17",
      name: "Both teams scored",
      team: "both",
      category: "Scoring Pattern",
      script: "homeGoals > 0 && awayGoals > 0",
    },
    {
      id: "18",
      name: "Only home team scored",
      team: "home",
      category: "Scoring Pattern",
      script: "homeGoals > 0 && awayGoals === 0",
    },
    {
      id: "19",
      name: "Only away team scored",
      team: "away",
      category: "Scoring Pattern",
      script: "awayGoals > 0 && homeGoals === 0",
    },
    {
      id: "20",
      name: "Match ended in draw",
      team: "both",
      category: "Result",
      script: "homeGoals === awayGoals",
    },
    {
      id: "21",
      name: "Draw after first goal (home)",
      team: "both",
      category: "Result",
      script: "homeGoals === awayGoals && firstTeamScored === 'home'",
    },
    {
      id: "22",
      name: "Draw after first goal (away)",
      team: "both",
      category: "Result",
      script: "homeGoals === awayGoals && firstTeamScored === 'away'",
    },
    {
      id: "23",
      name: "Home wins after scoring first",
      team: "home",
      category: "Scoring Pattern",
      script: "firstTeamScored === 'home' && homeGoals > awayGoals",
    },
    {
      id: "24",
      name: "Away wins after scoring first",
      team: "away",
      category: "Scoring Pattern",
      script: "firstTeamScored === 'away' && awayGoals > homeGoals",
    },
    {
      id: "25",
      name: "Home comeback win",
      team: "home",
      category: "Scoring Pattern",
      script: "firstTeamScored === 'away' && homeGoals > awayGoals",
    },
    {
      id: "26",
      name: "Away comeback win",
      team: "away",
      category: "Scoring Pattern",
      script: "firstTeamScored === 'home' && awayGoals > homeGoals",
    },
    {
      id: "27",
      name: "Clean sheet by home",
      team: "home",
      category: "Defending",
      script: "awayGoals === 0",
    },
    {
      id: "28",
      name: "Clean sheet by away",
      team: "away",
      category: "Defending",
      script: "homeGoals === 0",
    },
    {
      id: "29",
      name: "Home scored in both halves",
      team: "home",
      category: "Scoring Pattern",
      script: "firstHalfHomeGoals > 0 && secondHalfHomeGoals > 0",
    },
    {
      id: "30",
      name: "Away scored in both halves",
      team: "away",
      category: "Scoring Pattern",
      script: "firstHalfAwayGoals > 0 && secondHalfAwayGoals > 0",
    },
  ];
}
