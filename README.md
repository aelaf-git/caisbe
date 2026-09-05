# CAISBE

Monorepo with a **Next.js** frontend (`web/`) and a **FastAPI** backend (`api/`).

## Project structure

```
caisbe/
├── api/                    # FastAPI backend
│   ├── app/
│   │   ├── main.py         # FastAPI app entry
│   │   ├── config.py       # Settings
│   │   ├── routers/        # API route modules
│   │   └── schemas/        # Pydantic models
│   ├── requirements.txt
│   └── .env.example
└── web/                    # Next.js frontend
    ├── app/
    ├── lib/                # API client and shared utilities
    └── package.json
```

## Local development

### API (FastAPI)

Postgres is required. Start it with the API stack (port **5433** so it does not collide with a system Postgres on 5432):

```bash
cd api
docker compose up -d postgres
```

Then:

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

To copy an existing SQLite file (`api/caisbe.db`) into Postgres, start the API once (creates tables), then:

```bash
cd api
.venv/bin/python -m scripts.copy_sqlite_to_postgres
```

If `pip install` fails with `externally-managed-environment`, use:

```bash
.venv/bin/python3 -m pip install -r requirements.txt
```

API runs at `http://127.0.0.1:8000`.

- Health check: `http://127.0.0.1:8000/api/health`
- Interactive docs: `http://127.0.0.1:8000/docs`

### Web (Next.js)

```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev
```

App runs at `http://localhost:3000`.

The web app proxies `/api/*` requests to FastAPI (see `web/next.config.ts`).

### Calling the API from Next.js

```ts
import { apiFetch } from "@/lib/api";

const health = await apiFetch<{ status: string; service: string }>("/health/");
```

### Adding a new FastAPI router

1. Create `api/app/routers/my_feature.py` with an `APIRouter`
2. Create schemas in `api/app/schemas/` as needed
3. Include the router in `api/app/main.py`:

```python
from app.routers import my_feature

app.include_router(my_feature.router, prefix="/api")
```

## Docker (per service, with watch)

Each app has its own Dockerfile and compose file. Source changes sync into the container (`docker compose up --watch`). Do not commit `.env` files.

**Start the API stack first** — frontends join the shared Docker network `caisbe_dev` and talk to the API at `http://caisbe-api:8000` (not `host.docker.internal`, which is unreliable on Linux when the API runs in another container).

```bash
cd api
docker compose up --watch
```

Then in separate terminals:

```bash
cd admin
docker compose up --watch
```

Or run everything from the repo root:

```bash
docker compose up --watch
```

```bash
cd web
docker compose up --watch
```

```bash
cd portal
docker compose up --watch
```

| Service | Compose | URL |
|---------|---------|-----|
| API     | `api/`  | http://127.0.0.1:8000 |
| Web     | `web/`  | http://localhost:3000 |
| Admin   | `admin/`| http://localhost:3001 |
| Portal  | `portal/` | http://localhost:3002 |

## Ports

| Service | URL |
|---------|-----|
| Web     | http://localhost:3000 |
| Admin   | http://localhost:3001 |
| Portal  | http://localhost:3002 |
| API     | http://127.0.0.1:8000 |
| API Docs| http://127.0.0.1:8000/docs |
| Postgres| 127.0.0.1:5433 (user/password/db: `caisbe`) |
