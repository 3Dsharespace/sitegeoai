# Deployment Guide — GeoAI 3D Construction Planner

## Architecture

| Component | Recommended host | Notes |
|-----------|------------------|-------|
| Frontend (Next.js) | **Netlify** | Static/SSR via `@netlify/plugin-nextjs` |
| Backend (FastAPI) | **Render** | Web service, binds `0.0.0.0:$PORT` |
| Database | **Render Postgres** or external PostGIS | Required for full survey mode |
| Redis | **Render Key Value** or Upstash | Optional; in-process fallback in dev |
| Object storage | **S3-compatible** (AWS S3, MinIO, R2) | Optional; local FS not durable on Render |

---

## Deployment checklist

Use this order for first production deploy:

1. **Push code to GitHub** (ensure `.env` is not tracked — see `.gitignore`)
2. **Create Render PostgreSQL** (or external PostGIS) and run `CREATE EXTENSION IF NOT EXISTS postgis;`
3. **Create Render web service** from `render.yaml` or manually (`rootDir: backend`)
4. **Set backend environment variables** (see table below)
5. **Deploy backend** — build runs `alembic upgrade head`
6. **Test backend**
   - `GET https://your-api.onrender.com/health`
   - `GET https://your-api.onrender.com/api/health`
   - `GET https://your-api.onrender.com/api/system/status`
   - `GET https://your-api.onrender.com/api/projects/demo`
7. **Create Netlify site** linked to repo (`base: frontend`)
8. **Set frontend env:** `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`
9. **Deploy frontend**
10. **Set backend** `NEXT_PUBLIC_APP_URL=https://your-site.netlify.app` (CORS)
11. **Redeploy backend** if CORS origin was added after first deploy
12. Open **dashboard** on Netlify URL
13. Run full **demo path** (see `MANUAL_QA.md`)
14. Test **PDF / CSV / GeoJSON** exports from Report page

---

## Frontend — Netlify

Config: `netlify.toml`

```bash
cd frontend
npm ci
npm run build
```

### Required environment variables (Netlify UI)

| Variable | Example | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_API_URL` | `https://geoai-api.onrender.com` | **Yes** |

### Optional

| Variable | Example |
|----------|---------|
| `NEXT_PUBLIC_APP_URL` | `https://your-site.netlify.app` |

**Never** set OpenAI, Anthropic, Gemini, Mapbox, Cesium Ion, Google Maps, database, or storage secrets on Netlify.

### Deploy with CLI

```bash
npx netlify link
npx netlify deploy --prod
```

---

## Backend — Render

Config: `render.yaml` (Blueprint)

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build | `pip install -r requirements.txt && alembic upgrade head` |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/health` |

### Required environment variables (Render)

```env
DATABASE_URL=postgresql://...
APP_SECRET=<generate-strong-secret>
ENVIRONMENT=production
NEXT_PUBLIC_APP_URL=https://your-site.netlify.app
```

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | **Yes** | PostgreSQL with PostGIS |
| `APP_SECRET` | **Yes** | JWT signing — never use `dev-secret-change-me` |
| `ENVIRONMENT` | Recommended | `production` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Frontend origin for CORS |

> **Note:** This project uses `APP_SECRET`, not `SECRET_KEY`.

### Optional environment variables (Render)

```env
REDIS_URL=
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GEMINI_API_KEY=
MAPBOX_TOKEN=
CESIUM_ION_TOKEN=
GOOGLE_MAPS_API_KEY=
AUTH_REQUIRE_JWT=false
```

| Variable | When needed |
|----------|-------------|
| `REDIS_URL` | Async design jobs at scale |
| `S3_*` | Persistent GLB/PDF uploads on Render |
| AI keys | Real LLM design (mock when blank) |
| Map keys | HD imagery / 3D tiles (OSM/Esri fallback when blank) |
| `AUTH_REQUIRE_JWT` | Set `true` for locked-down production |

Render filesystem is **ephemeral** — use S3 + Postgres, not local disk.

### API endpoints to verify after deploy

| Endpoint | Expected |
|----------|----------|
| `GET /health` | `{ "status": "ok" }` |
| `GET /api/health` | Same as above |
| `GET /api/system/status` | Database mode, PostGIS flag, providers |
| `GET /api/projects/demo` | Demo Flyover with boundary |

---

## PostGIS on Render

1. Create PostgreSQL instance.
2. Connect and run: `CREATE EXTENSION IF NOT EXISTS postgis;`
3. Set `DATABASE_URL` on the API service.
4. Migrations run on deploy via `alembic upgrade head`.
5. Confirm: `GET /api/system/status` → `"postgis_available": true`

---

## Docker Compose (local / staging)

```bash
docker compose up -d
cd backend && alembic upgrade head
```

Services: PostGIS (`5432`), Redis (`6379`), MinIO (`9000`/`9001`).

Copy `.env.example` → `.env` and point at local services.

---

## Security notes

### Safe in frontend (Netlify)

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_APP_URL`

### Backend only

- Database URLs, `APP_SECRET`, AI keys, S3 credentials
- Mapbox token (satellite proxied via `/api/tiles/satellite/...`)

### Browser-delivered map keys (intentional)

`/api/geocode/map-runtime-config` may return **Cesium Ion** and **Google Maps** keys for 3D tiles in the browser. These are not AI or storage secrets. Restrict them by **HTTP referrer / domain** in provider dashboards.

AI provider keys are **never** sent to the frontend.

---

## CI checks before deploy

```bash
cd backend && pip install -r requirements.txt && pytest
cd frontend && npm ci && npm run lint && npm run build
```

---

## Demo / production modes

| Mode | Database | Survey | AI |
|------|----------|--------|-----|
| Local demo | SQLite | Limited | Mock |
| Staging | PostGIS | Full | Optional keys |
| Production | PostGIS | Full | Real providers |

---

## Security checklist

- [ ] `APP_SECRET` is unique per environment
- [ ] `.env` not committed (check `git check-ignore .env`)
- [ ] No real API keys in repo history
- [ ] No AI/storage keys in frontend Netlify env
- [ ] Map keys domain-restricted if exposed to browser
- [ ] `AUTH_REQUIRE_JWT=true` when not demoing publicly
- [ ] Database and Redis not publicly exposed without auth

---

## Manual QA

See **[MANUAL_QA.md](./MANUAL_QA.md)** for page-by-page and demo-flow checklists.

---

## Disclaimer

Deployed outputs remain **preliminary planning only**. Disclaimers are built into the UI and PDF exports.
