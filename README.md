# GeoAI 3D Construction Planner

A preliminary planning tool that lets you select a real-world location, choose a
construction project type (flyover, building, pipeline, road), and generate an
AI-assisted preliminary 3D concept with quantity, excavation, cost, timeline,
and risk estimates.

> **IMPORTANT DISCLAIMER**
> All generated designs, dimensions, material estimates, costs, reinforcement
> assumptions, foundation depths, excavation quantities, and construction
> methodology are **preliminary planning outputs only**. They are NOT final
> structural drawings, NOT legal construction approval documents, and NOT a
> replacement for licensed civil/structural/geotechnical engineers, surveyors,
> architects, local authority approvals, or code compliance checks.

## Stack

- **Frontend** — Next.js (App Router, TypeScript, Tailwind), CesiumJS, MapLibre GL, Zustand, React Hook Form + Zod
- **Backend** — FastAPI, SQLAlchemy + Alembic, PostGIS, Redis, Arq workers
- **Storage** — MinIO (S3-compatible) for generated GLB models and PDF reports
- **AI** — provider abstraction (OpenAI / Anthropic / Gemini / mock); all
  quantities are computed by deterministic backend calculators, never guessed
  by the LLM.

## Local development

```bash
cp .env.example .env
docker compose up -d          # PostGIS + Redis + MinIO

# Backend
cd backend
python -m venv .venv && .venv\Scripts\activate   # (Windows)
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload                    # http://localhost:8000

# Worker (separate terminal, optional in dev)
cd backend
arq app.workers.tasks.WorkerSettings

# Frontend
cd frontend
npm install
npm run dev                                      # http://localhost:3000
```

### Running without Docker

If Docker is unavailable, the backend automatically falls back to:

- **SQLite** (`backend/dev.db`) instead of PostGIS — boundaries are stored as
  GeoJSON; spatial queries are computed with Shapely in Python.
- **In-process job execution** instead of Redis/Arq.
- **Local filesystem** (`backend/storage/`) instead of MinIO.

All external APIs (geocoding, OSM Overpass, terrain, LLMs) have mock providers
so the full flow works offline with no API keys.

## Project structure

```
frontend/   Next.js app (landing, dashboard, workspace, analysis, estimate, report, admin)
backend/    FastAPI app (API routes, services, calculators, AI orchestrator, exports, Arq worker)
```

## API docs

With the backend running, interactive docs are at http://localhost:8000/docs.
