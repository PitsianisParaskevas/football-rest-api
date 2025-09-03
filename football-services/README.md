npm run dev:server # starts proxy at http://localhost:3000
npm run dev # starts Vite at http://localhost:5173 (proxied to backend)

# ⚽ Football Services (Frontend Import Tool)

This project is the **frontend utility** for importing football data from [Sofascore](https://www.sofascore.com) into your own database (via the `football-rest-api` backend).

It contains:

- React (Vite) frontend with input forms and pages (e.g. `GetGeneralData`, `ImportRound`).
- A small Express **proxy server** to fetch Sofascore data safely (no CORS, no 403).
- Service layer (`GeneralDataService`, `MatchDayService`) to fetch/transform Sofascore data.
- API clients (`apiGeneralData.ts`, `apiMatchDay.ts`) to insert data into your DB backend.

---

https://www.sofascore.com/api/v1/event/12436580/lineups
