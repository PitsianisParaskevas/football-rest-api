import { runScheduleFetch } from "./schedule";
import { runResultsFetch } from "./results";

const fullSchedule = await runScheduleFetch(
  "https://www.sofascore.com/tournament/football/england/premier-league/17#id:61627"
);

const responseObject = await runResultsFetch(
  "https://www.sofascore.com/football/match/liverpool-aston-villa/PU#id:12437019"
);

console.log("fullSchedule", fullSchedule);
console.log("responseObject", responseObject);

// Player fetch
// https://www.sofascore.com/football/player/marcus-rashford/814590
// https://www.sofascore.com/football/${player.slug}/${player.id}
