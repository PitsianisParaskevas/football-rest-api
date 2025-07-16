# Sofascore REST API

A TypeScript-based backend project for extracting, transforming, and structuring football match data from Sofascore using their unofficial API.

---

## ⚙️ Tech Stack

- **TypeScript** – type-safe logic
- **Axios** – HTTP requests to Sofascore API
- **PostgreSQL** – database for storing structured match data
- **Vite** – for dev tooling and optional frontend preview
- **dotenv** – for environment variable management

---

## 🚀 Project Goals

1. Fetch match data (lineups, statistics, incidents, shotmaps, heatmaps, etc.) from Sofascore.
2. Transform and enrich the data.
3. Structure the output into PostgreSQL-ready rows.
4. Optionally preview or debug data in the browser via Vite.

---

## 📁 Folder Structure

sofascore-rest-api/
├── src/
│ ├── scripts/
│ ├── services/
│ ├── utils/
│ ├── data/
│ └── index.ts # Main entry point
├── .env
├── tsconfig.json
├── vite.config.ts
├── package.json

// create server for endpoints  
"dev": "tsx src/scripts/server.ts", // npm serve

// if you want to run the fetch from sofa logic
"dev": "vite", // npm run start
