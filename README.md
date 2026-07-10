# CAISBE

Monorepo with a **Next.js** frontend (`web/`) and a **Django REST Framework** API (`api/`).

## Project structure

```
caisbe/
├── api/                    # Django REST Framework API
│   ├── apps/               # Django apps (add new apps here)
│   │   └── core/           # Core endpoints (health, etc.)
│   ├── config/             # Project settings, URLs, WSGI/ASGI
│   ├── manage.py
│   └── requirements.txt
└── web/                    # Next.js frontend
    ├── app/
    ├── lib/                # API client and shared utilities
    └── package.json
```

## Local development

### API (Django REST Framework)

```bash
cd api
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
cp .env.example .env
python3 manage.py migrate
python3 manage.py runserver
```

If `pip install` fails with `externally-managed-environment`, your shell is using system pip. Use:

```bash
.venv/bin/python3 -m pip install -r requirements.txt
```

API runs at `http://127.0.0.1:8000`.

Health check: `http://127.0.0.1:8000/api/health/`

### Web (Next.js)

```bash
cd web
npm install
cp .env.local.example .env.local
npm run dev
```

App runs at `http://localhost:3000`.

The web app proxies `/api/*` requests to Django (see `web/next.config.ts`).

### Calling the API from Next.js

```ts
import { apiFetch } from "@/lib/api";

const health = await apiFetch<{ status: string; service: string }>("/health/");
```

### Adding a new DRF app

```bash
cd api
source .venv/bin/activate
python3 manage.py startapp my_feature apps/my_feature
```

Then register `apps.my_feature` in `api/config/settings.py` and include its URLs in `api/config/urls.py`.

## Ports

| Service | URL |
|---------|-----|
| Web     | http://localhost:3000 |
| API     | http://127.0.0.1:8000 |
