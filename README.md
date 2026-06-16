# GeoAI 3D Construction Planner

A preliminary planning platform for civil and infrastructure projects: pick a real-world site, define boundaries and alignments, run site analysis, generate AI-assisted **concept** designs, and produce deterministic BOQ, cost, timeline, and export packages.

> **IMPORTANT DISCLAIMER**  
> All designs, quantities, costs, and schedules are **preliminary planning outputs only**. They are NOT final structural drawings, NOT legal construction approvals, and NOT a substitute for licensed engineers, surveyors, and authority sign-off.

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js (App Router), TypeScript, Tailwind, MapLibre GL, CesiumJS, Zustand |
| Backend | FastAPI, SQLAlchemy, Alembic |
| Database | PostGIS (production) · SQLite fallback (local demo) |
| Jobs | Redis + Arq · in-process dev fallback |
| Storage | MinIO/S3 · local filesystem dev fallback |
| AI | Ollama (local) / OpenAI / Anthropic / **mock** — quantities always from backend calculators |

## Features

- Landing, dashboard, new project wizard
- Project workspace with map + 3D + AI design studio
- Site analysis, BOQ/estimate, cost analysis, scenarios, timeline
- Reports with PDF / CSV / GeoJSON / DXF export
- Survey-grade mode: imports, CRS, GCP validation, accuracy tiers, mesh export
- **Project validation** API and UI readiness checklist
- **System status** (PostGIS vs SQLite, Redis, storage, providers)
- Seeded demo: **Demo Flyover (Bengaluru)**

## Quick start

```bash
cp .env.example .env
docker compose up -d          # optional: PostGIS + Redis + MinIO

cd backend && pip install -r requirements.txt && alembic upgrade head
uvicorn app.main:app --reload  # http://localhost:8000

cd frontend && npm install && npm run dev  # http://localhost:3000
```

Without Docker, SQLite + mock providers work for the full demo flow. See **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** for details.

## Documentation

- **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** — dev environment, env vars, migrations, tests, demo flow
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Render backend, Netlify frontend, smoke tests, CI
- **[STAGING_CHECKLIST.md](./STAGING_CHECKLIST.md)** — pre-launch staging QA checklist
- **[MANUAL_QA.md](./MANUAL_QA.md)** — browser QA checklist before demo/deploy

## API

Interactive docs: http://localhost:8000/docs

Key endpoints:

- `GET /health`
- `GET /api/system/status`
- `GET /api/projects/demo`
- `GET /api/projects/{id}/validation`
- `GET /api/projects/{id}/exports/pdf`

## Accuracy tiers

| Tier | Label | Use |
|------|-------|-----|
| `visual` | Visual | Concept / client preview |
| `gis_grade` | GIS | Planning GIS workflows |
| `survey_grade` | Survey | Survey-adjusted geometry |
| `engineering_ready` | Engineering ready | Highest input confidence (still preliminary output) |

Full survey workflows require **PostGIS**. SQLite shows **Limited GIS mode** in Settings.

## Tests

```bash
cd backend
pytest

# Production smoke (against deployed API)
python scripts/production_smoke.py --base-url https://YOUR-API.onrender.com
```

Covers health, demo project, validation, calculators, auth, usage limits, deployment config, job reliability, and PDF export.

## Project structure

```
frontend/     Next.js app
backend/      FastAPI app, calculators, survey pipeline, exports
docker-compose.yml   PostGIS, Redis, MinIO
netlify.toml         Frontend deploy
render.yaml          Backend Blueprint
.env.example         Environment template
```

## License

Private / internal use — adjust as needed for your organization.
