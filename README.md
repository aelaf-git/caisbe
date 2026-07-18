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

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
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

## Ports

| Service | URL |
|---------|-----|
| Web     | http://localhost:3000 |
| API     | http://127.0.0.1:8000 |
| API Docs| http://127.0.0.1:8000/docs |
