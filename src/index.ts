// src/index.ts
// Client-side script to fetch both tournament schedule and match results via input fields
import { runScheduleFetch } from "./scripts/schedule";
import { runResultsFetch } from "./scripts/results";


window.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output") as HTMLPreElement;

  // Create container div for inputs
  const container = document.createElement("div");
  container.style.display = "flex";
  container.style.flexDirection = "column";
  container.style.gap = "8px";
  container.style.maxWidth = "600px";
  container.style.margin = "1rem auto";

  // --- Tournament Schedule Input ---
  const tournamentLabel = document.createElement("label");
  tournamentLabel.textContent = "Tournament URL:";
  const tournamentInput = document.createElement("input");
  tournamentInput.id = "tournamentInput";
  tournamentInput.type = "text";
  tournamentInput.placeholder = "Enter Sofascore tournament URL";
  tournamentInput.style.padding = "8px";
  const tournamentBtn = document.createElement("button");
  tournamentBtn.textContent = "Fetch Schedule";
  tournamentBtn.style.padding = "8px";

  // --- Match Results Input ---
  //   const matchLabel = document.createElement('label');
  //   matchLabel.textContent = 'Match URL:';
  //   const matchInput = document.createElement('input');
  //   matchInput.id = 'matchInput';
  //   matchInput.type = 'text';
  //   matchInput.placeholder = 'Enter Sofascore match URL';
  //   matchInput.style.padding = '8px';
  //   const matchBtn = document.createElement('button');
  //   matchBtn.textContent = 'Fetch Results';
  //   matchBtn.style.padding = '8px';

  // Append elements
  //   container.append(tournamentLabel, tournamentInput, tournamentBtn,
  //                    matchLabel, matchInput, matchBtn);
  container.append(tournamentLabel, tournamentInput, tournamentBtn);
  document.body.insertBefore(container, output);

  // Handler for fetching tournament schedule
  tournamentBtn.addEventListener("click", async () => {
    const url = tournamentInput.value.trim();
    if (!url) {
      output.textContent = "Please enter a tournament URL.";
      return;
    }
    // output.textContent = "Loading schedule...";
    try {
      const schedule = await runScheduleFetch(url);
      console.log(schedule);
      //   output.textContent = "Schedule:\n" + JSON.stringify(schedule, null, 2);
    } catch (err: any) {
      output.textContent = "Error fetching schedule: " + err.message;
    }
  });

  // Handler for fetching match results
  //   matchBtn.addEventListener('click', async () => {
  //     const url = matchInput.value.trim();
  //     if (!url) {
  //       output.textContent = 'Please enter a match URL.';
  //       return;
  //     }
  //     output.textContent = 'Loading results...';
  //     try {
  //       const results = await runResultsFetch(url);
  //       output.textContent = 'Results:\n' + JSON.stringify(results, null, 2);
  //     } catch (err: any) {
  //       output.textContent = 'Error fetching results: ' + err.message;
  //     }
  //   });
});
