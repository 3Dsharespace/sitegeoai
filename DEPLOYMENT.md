# Deployment Guide — GeoAI 3D Construction Planner

Production target: **Render** (API + worker + Postgres + Redis) + **Netlify** (Next.js frontend).

---

## Architecture

| Component | Host | Notes |
|-----------|------|-------|
| Frontend | **Netlify** | `@netlify/plugin-nextjs`; no backend required at build time |
| API | **Render web** (`geoai-api`) | FastAPI, `/health`, binds `0.0.0.0:$PORT` |
| Worker | **Render worker** (`geoai-worker`) | Arq — runs design generation jobs |
| Database | **Render Postgres** | PostGIS extension required for full survey mode |
| Redis | **Render Key Value** | Job status, rate limits, Arq queue |
| Object storage | **S3 / R2 / MinIO** | **Required** for durable GLB/PDF on Render (ephemeral disk) |

Blueprint: [`render.yaml`](./render.yaml)  
Local stack: [`docker-compose.yml`](./docker-compose.yml)

---

## Production environment checklist

### Backend (Render — shared by API + worker)

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | **Yes** | From Render Postgres (`geoai-postgres`) |
| `REDIS_URL` | **Yes** | From Render Key Value (`geoai-redis`) |
| `APP_SECRET` | **Yes** | Auto-generated in Blueprint — rotate if leaked |
| `ENVIRONMENT` | **Yes** | `production` |
| `AUTH_REQUIRE_JWT` | **Yes** | `true` |
| `NEXT_PUBLIC_APP_URL` | **Yes** | Netlify site URL (CORS) |
| `GENERATION_JOB_TIMEOUT_SECONDS` | Recommended | `300` |
| `USE_ARQ_WORKER` | **Yes** | `true` in production |
| `USAGE_LIMITS_ENABLED` | Optional | `true` (default) |
| `RATE_LIMITING_ENABLED` | Optional | `true` (default) |
| `S3_ENDPOINT` | **Yes*** | *Required for persistent models/exports |
| `S3_BUCKET` | **Yes*** | |
| `S3_ACCESS_KEY` | **Yes*** | |
| `S3_SECRET_KEY` | **Yes*** | |
| `AI_PROVIDER` | Optional | `mock` / `openai` / `anthropic` / `ollama` |
| `OPENAI_API_KEY` | Optional | |
| `ANTHROPIC_API_KEY` | Optional | |
| `GOOGLE_MAPS_API_KEY` | Optional | OSM/Esri fallback when blank |
| `MAPBOX_TOKEN` | Optional | |
| `CESIUM_ION_TOKEN` | Optional | 3D tiles |

### Frontend (Netlify)

| Variable | Required | Notes |
|----------|----------|-------|
| `NEXT_PUBLIC_API_URL` | **Yes** | Exact Render web service URL from the dashboard (includes suffix), e.g. `https://geoai-api-91oc.onrender.com` — **not** a shortened `geoai-api.onrender.com` unless you configured that custom domain on Render |
| `NEXT_PUBLIC_AUTH_REQUIRE_JWT` | **Yes** | `true` in production |
| `NEXT_PUBLIC_MAP_ENGINE` | Optional | `maplibre` (default) or `cesium` |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Optional | Browser-exposed; restrict by referrer |
| `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Optional | Browser-exposed; restrict by referrer |

**Never** put database URLs, `APP_SECRET`, AI keys, or S3 secrets in Netlify.

---

## Deploy backend (Render)

### Option A — Blueprint (recommended)

1. Push repo to GitHub.
2. Render Dashboard → **New** → **Blueprint** → connect repo.
3. Review services created from `render.yaml`:
   - `geoai-postgres` (database)
   - `geoai-redis` (Key Value)
   - `geoai-api` (web)
   - `geoai-worker` (worker)
4. Set **`NEXT_PUBLIC_APP_URL`** on the `geoai-backend` env group to your Netlify URL.
5. Set **S3** credentials (see [Object storage](#object-storage-s3--minio)).
6. Deploy. Build runs `alembic upgrade head` on API and worker.
7. Verify:
   ```bash
   curl https://YOUR-API.onrender.com/health
   curl https://YOUR-API.onrender.com/api/system/status
   ```

### Option B — Manual web service

| Setting | Value |
|---------|-------|
| Root directory | `backend` |
| Build | `pip install -r requirements.txt && alembic upgrade head` |
| Start | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| Health check | `/health` |

Add a separate **Background Worker** with start command:
```bash
arq app.workers.tasks.WorkerSettings
```

---

## Deploy frontend (Netlify)

Config: [`netlify.toml`](./netlify.toml)

```bash
cd frontend
npm ci
npm run build   # uses NEXT_PUBLIC_* only — no local backend needed
```

### Netlify CLI

```bash
npx netlify link
npx netlify env:set NEXT_PUBLIC_API_URL https://YOUR-API.onrender.com
npx netlify env:set NEXT_PUBLIC_AUTH_REQUIRE_JWT true
npx netlify deploy --prod
```

After frontend deploy, set backend `NEXT_PUBLIC_APP_URL` to the Netlify URL and redeploy API (CORS).

---

## Production smoke test

After both services are live:

```bash
cd backend
pip install -r requirements.txt
python scripts/production_smoke.py --base-url https://YOUR-API.onrender.com
```

The script checks:

- `/health`, `/api/system/status`
- `X-Request-ID` on responses
- Production readiness flags (`deployment_ready`, auth, Redis/worker)
- Auth-required behavior (401 when JWT required)
- File access protection (401/403 for anonymous GLB fetch in prod mode)
- Register + login + `/api/auth/me`
- Create project with minimal boundary
- Start `fast_preview` generation
- Poll job until preview/completed/failed (includes job diagnostics when present)
- List scenarios, scenario detail, scenario compare (when 2+ scenarios exist)
- Usage summary
- Model URL when available

Exit code **0** = all checks passed. Safe diagnostics only (no secrets printed).

See also **[STAGING_CHECKLIST.md](./STAGING_CHECKLIST.md)** for manual pre-launch verification.

---

## Error tracking (optional Sentry)

Sentry is **optional** — the app runs normally without it.

### Backend

Set on Render (API + worker env group):

| Variable | Notes |
|----------|-------|
| `SENTRY_DSN` | From Sentry project settings |
| `SENTRY_ENVIRONMENT` | e.g. `staging`, `production` |
| `SENTRY_TRACES_SAMPLE_RATE` | e.g. `0.1` |

When `SENTRY_DSN` is set, the API initializes `sentry-sdk` at startup. Verify via `GET /api/system/status` → `observability.sentry_enabled`.

### Frontend

Set `NEXT_PUBLIC_SENTRY_DSN` in Netlify. The repo includes a lightweight hook in `frontend/lib/observability.ts`; install `@sentry/nextjs` and wire `Sentry.init` there when you want client-side error forwarding.

---

## Local production-like mode

Simulate production constraints locally:

```bash
# Terminal 1 — infrastructure
docker compose up -d

# Terminal 2 — API
cd backend
cp ../.env.example ../.env
# Edit .env:
#   ENVIRONMENT=production
#   AUTH_REQUIRE_JWT=true
#   DATABASE_URL=postgresql+psycopg2://geoai:geoai@localhost:5432/geoai
#   REDIS_URL=redis://localhost:6379/0
#   USE_ARQ_WORKER=true
#   APP_SECRET=local-prod-test-secret-not-for-deploy
#   NEXT_PUBLIC_APP_URL=http://localhost:3000
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000

# Terminal 3 — worker
cd backend
arq app.workers.tasks.WorkerSettings

# Terminal 4 — frontend
cd frontend
# frontend/.env.local:
#   NEXT_PUBLIC_API_URL=http://localhost:8000
#   NEXT_PUBLIC_AUTH_REQUIRE_JWT=true
npm run dev
```

Smoke against local API:

```bash
python backend/scripts/production_smoke.py --base-url http://localhost:8000
```

---

## Create first admin user

1. Register via the app or API:
   ```bash
   curl -X POST https://YOUR-API/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Admin","email":"you@company.com","password":"YourSecurePass1"}'
   ```
2. Promote to admin (from repo, with `DATABASE_URL` set):
   ```bash
   cd backend
   python scripts/create_admin.py you@company.com
   ```
3. Log in again — `/api/auth/me` should show `"role": "admin"`, `"plan": "admin"`.

Alternatively, SQL on Postgres:
```sql
UPDATE users SET role = 'admin', plan = 'admin' WHERE email = 'you@company.com';
```

---

## Rotate API keys

1. Generate new key in provider dashboard (OpenAI, Mapbox, S3, etc.).
2. Update Render env vars on **`geoai-backend`** group (applies to API + worker).
3. Redeploy API and worker (or use Render “Save and deploy”).
4. For browser map keys, update Netlify `NEXT_PUBLIC_*` vars and redeploy frontend.
5. Revoke old keys after verifying `/api/system/status` and maps.

Rotate `APP_SECRET` only with a plan to invalidate all JWTs (all users must log in again).

---

## Object storage (S3 / MinIO)

Render’s filesystem is **ephemeral**. Without S3:

- GLB/PDF files are lost on restart
- `/api/system/status` reports `local_storage` as **critical** in production

**MinIO locally** (docker-compose):

```env
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=geoai-files
S3_ACCESS_KEY=geoai
S3_SECRET_KEY=your-minio-secret
```

**Production:** use AWS S3, Cloudflare R2, or similar. Set all four `S3_*` vars on Render.

---

## Migrations & startup

| Step | When |
|------|------|
| `alembic upgrade head` | Render **build** (API + worker) |
| `init_db()` | API **startup** — seeds rates/templates/demo, creates missing tables |
| Startup warnings | Logged via `production_readiness()` — check Render logs |
| `/api/system/status` | `production.deployment_ready`, `critical_count`, warnings |

**PostGIS:** Migrations `001` and `002` both run `CREATE EXTENSION IF NOT EXISTS postgis` on PostgreSQL before any `geometry` columns are used. You do **not** need a separate manual SQL step if the build completes `alembic upgrade head` successfully. After deploy, confirm `postgis_available: true` in `/api/system/status`. If extension creation is blocked by your Postgres provider, run `CREATE EXTENSION IF NOT EXISTS postgis;` once in the database shell, then redeploy.

**Note:** Migration `002` adds `engineering_layers.geom` as PostGIS `geometry(Geometry, 0)`. It is idempotent (skips tables/columns that already exist from `001`).

SQLite is allowed for local dev only. Production with SQLite triggers a **critical** warning.

---

## CI/CD

GitHub Actions: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml)

On push/PR to `main`:

- Backend: `pytest`
- Frontend: `npm run lint`, `npm test`, `npm run build`

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| **401 on all API calls** | JWT required but no token | Set `NEXT_PUBLIC_AUTH_REQUIRE_JWT=true` on Netlify; log in; check `Authorization` header |
| **401 after deploy** | Wrong `APP_SECRET` or expired token | Log in again; verify same secret on API/worker |
| **CORS errors** | Frontend URL not allowed | Set `NEXT_PUBLIC_APP_URL` on backend to exact Netlify URL; redeploy API. Also verify `NEXT_PUBLIC_API_URL` on Netlify matches your **Render dashboard** service URL (404 on `/health` means wrong host, not CORS) |
| **Model not showing** | Job failed or GLB missing | Check job status `/api/jobs/{id}`; verify worker running; check S3 config |
| **GLB 404** | Ephemeral disk or auth | Use S3; ensure logged in; files served via `/files/...` with JWT |
| **Job stuck queued** | Worker not running or no Redis | Enable `geoai-worker`; verify `REDIS_URL`; `USE_ARQ_WORKER=true` |
| **Redis unavailable** | Wrong URL or service down | Check Render Key Value; `GET /api/system/status` → `redis_available` |
| **Map tiles missing** | No Mapbox/Google token | Add keys or use OSM fallback; restrict public keys by domain |
| **429 usage limit** | Free plan caps | Settings → usage card; wait for daily reset or promote to `pro`/`admin` |
| **PostGIS / survey disabled** | SQLite or extension missing | Use Render Postgres; migrations enable PostGIS automatically — verify `postgis_available` in system status |
| **deployment_ready: false** | Critical config warnings | Fix items in `/api/system/status` → `production.warnings` |

---

## Security checklist

- [ ] `APP_SECRET` unique per environment (not `dev-secret-change-me`)
- [ ] `AUTH_REQUIRE_JWT=true` in production
- [ ] S3 configured for file persistence
- [ ] Redis configured for jobs + rate limits
- [ ] Worker service running alongside API
- [ ] No secrets in frontend env or git
- [ ] Map keys referrer-restricted
- [ ] First admin created intentionally (not default dev user)

---

## Local dev quickstart

See **[LOCAL_SETUP.md](./LOCAL_SETUP.md)** for SQLite/mock mode without Docker.

---

## Manual QA

See **[MANUAL_QA.md](./MANUAL_QA.md)** for browser checklists.

---

## Disclaimer

All outputs remain **preliminary planning only** — not construction-ready drawings or approvals.
