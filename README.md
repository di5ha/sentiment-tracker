# sentiment-tracker
*Real-time sentiment analytics dashboard powered by a Python backend and a Next.js frontend, sourcing data from a Snowflake data layer.*

![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=Python&logoColor=white) ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=Next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=TypeScript&logoColor=white) ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=React&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=TailwindCSS&logoColor=white) ![Snowflake](https://img.shields.io/badge/Snowflake-1D4ED8?style=flat-square&logo=Snowflake&logoColor=white) ![SnowflakePy](https://img.shields.io/badge/SnowflakePy-1D4ED8?style=flat-square&logo=Snowflake&logoColor=white) ![SQL](https://img.shields.io/badge/SQL-4169E1?style=flat-square&logo=PostgreSQL&logoColor=white)

1) Title + Badge Bar
2) Overview
3) System Architecture
4) Tech Stack
5) Quick Start
6) Key Features

2) Overview
sentiment-tracker is a full-stack sentiment analytics dashboard that ingests, preprocesses, and visualizes sentiment data from a Snowflake data layer. It uses a Python-based backend to run an ETL pipeline (Snowflake ingestion and preprocessing) and a Next.js/React frontend for KPI cards, mood meters, trend charts, and a tweet explorer. Data flows from an ingestion layer into Snowflake and is exposed to the frontend via a RESTful API.

3) System Architecture
```mermaid
graph TD
Frontend[Frontend]
Backend[Backend]
Snowflake[Snowflake]
Ingest[Ingestion]
Prep[Preprocessing]
External[ExternalAPI]

Frontend --REST--> Backend
Backend --SQL--> Snowflake
Ingest --Load--> Snowflake
Prep --SQL--> Snowflake
External --REST--> Ingest
```

4) Tech Stack
| Category | Technologies |
|----------|-------------|
| Backend  | ![Python](https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=Python&logoColor=white) ![SnowflakePy](https://img.shields.io/badge/SnowflakePy-1D4ED8?style=flat-square&logo=Snowflake&logoColor=white) ![SQL](https://img.shields.io/badge/SQL-4169E1?style=flat-square&logo=PostgreSQL&logoColor=white) |
| Frontend | ![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=Next.js&logoColor=white) ![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=TypeScript&logoColor=white) ![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=React&logoColor=white) ![Tailwind](https://img.shields.io/badge/Tailwind-06B6D4?style=flat-square&logo=TailwindCSS&logoColor=white) |
| Database | ![Snowflake](https://img.shields.io/badge/Snowflake-1D4ED8?style=flat-square&logo=Snowflake&logoColor=white) |

5) Quick Start
Prerequisites: Node.js 18+ and Python 3.11+.

```bash
# Clone the repository
git clone https://github.com/di5ha/sentiment-tracker.git
cd sentiment-tracker

# Backend setup
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt

# Frontend setup
cd frontend
npm ci

# Run (in separate terminals)
# Backend (ASGI)
uvicorn backend.main:app --reload
# Or if your backend is run directly
# python backend/main.py
```

6) Key Features
- ETL data pipeline: Snowflake ingestion and preprocessing to prepare analytics-ready sentiment data.
- Real-time KPI cards and mood meter: React components powered by a Tailwind-styled UI for fast, on-brand dashboards.
- Trend and distribution visualizations: Time-series sentiment trends and score distribution for in-depth insight.
- Tweet Explorer: Client-side filters and server-backed search to inspect individual tweets and their sentiments.
- Clean architecture with REST API: Clear separation of frontend and backend, enabling scalable deployment and DX-focused development.