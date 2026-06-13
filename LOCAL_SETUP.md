# Local Setup — GeoAI 3D Construction Planner

This guide covers running the platform locally for development and demo.

## Prerequisites

- **Node.js 20+** and npm
- **Python 3.11+** (3.13 tested)
- **Docker Desktop** (optional but recommended for PostGIS, Redis, MinIO)

## Quick start (recommended — with Docker)

```bash
# From repo root
cp .env.example .env

docker compose up -d   # PostGIS + Redis + MinIO

cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# New terminal — optional background worker (uses Redis when available)
cd backend
arq app.workers.tasks.WorkerSettings

# New terminal — frontend
cd frontend
npm install
npm run dev
```

Open:

- Frontend: http://localhost:3000
- API docs: http://localhost:8000/docs
- MinIO console: http://localhost:9001 (user `geoai`, password `geoai-secret`)

## Quick start (no Docker)

If Docker is unavailable, the backend **automatically falls back**:

| Service   | Full mode              | Dev fallback                    |
|-----------|------------------------|---------------------------------|
| Database  | PostGIS (PostgreSQL)   | SQLite at `backend/dev.db`      |
| Jobs      | Redis + Arq            | In-process execution            |
| Storage   | MinIO / S3             | `backend/storage/` filesystem   |
| AI / maps | Real API keys          | Mock providers (offline demo)   |

```bash
cp .env.example .env
# Leave DATABASE_URL unset or unreachable — SQLite is used automatically

cd backend
pip install -r requirements.txt
uvicorn app.main:app --reload

cd frontend
npm install
npm run dev
```

**Note:** Survey-grade imports, spatial indexes, and advanced CRS workflows require **PostGIS**. On SQLite you will see **Limited GIS mode** in Settings.

## Demo project

On first API startup, the backend seeds **Demo Flyover (Bengaluru)** (typically project id `5`).

Demo flow:

1. Dashboard → open demo project
2. Workspace / Map → boundary + alignment visible
3. Enable survey mode (full features need PostGIS)
4. 3D model, Estimate, Cost, Timeline, Report
5. Export PDF / CSV / GeoJSON

Works without API keys using mock AI and OSM/terrain fallbacks.

## Environment variables

Copy `.env.example` to `.env` at the repo root. Key variables:

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | No (dev) | PostGIS connection; omit for SQLite |
| `REDIS_URL` | No | Job queue; omit for in-process jobs |
| `S3_*` | No | MinIO/S3; omit for local filesystem |
| `APP_SECRET` | Yes (prod) | JWT signing |
| `NEXT_PUBLIC_API_URL` | Yes | Frontend → backend URL (e.g. `http://localhost:8000`) |
| `OPENAI_API_KEY` etc. | No | All blank → mock AI provider |

**Never put provider API keys in frontend env vars.** Only `NEXT_PUBLIC_*` URLs belong in the Next.js app.

## Migrations

```bash
cd backend
alembic upgrade head
alembic revision --autogenerate -m "describe change"   # when changing models
```

## Tests

```bash
cd backend
pip install -r requirements.txt
pytest
```

## Validation & system status

- `GET /api/projects/{id}/validation` — readiness checks before design/BOQ/export
- `GET /api/system/status` — database mode, PostGIS, Redis, storage, AI/map providers

These are shown in the workspace/map sidebar and Settings page.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Frontend can't reach API | Set `NEXT_PUBLIC_API_URL=http://localhost:8000` in `frontend/.env.local` |
| Survey import fails | Start Docker PostGIS and set `DATABASE_URL` |
| Port 3000 in use | Stop other Next.js dev servers |
| Empty demo project | Restart backend (seeds on startup) |

## Disclaimer

All outputs are **preliminary planning only** — not final engineering drawings or legal approvals.
