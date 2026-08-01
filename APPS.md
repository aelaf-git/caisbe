# CAISBE apps

| App | Folder | Port | Purpose |
|-----|--------|------|---------|
| Marketing site | `web/` | 3000 | Public landing / PD pages |
| Admin portal | `admin/` | 3001 | Course CMS only (no student enrollments) |
| Student portal | `portal/` | 3002 | Login, enroll, learn, certificates |
| API | `api/` | 8000 | FastAPI backend |

## Run locally

```bash
# API
cd api && source .venv/bin/activate && uvicorn app.main:app --reload

# Marketing
cd web && npm run dev

# Admin
cd admin && npm run dev

# Student portal
cd portal && npm run dev
```

Admin login defaults: `admin@caisbe.org` / `adminpass123`

Marketing navbar shows **Login** and **Register** only (both open the student portal).
Admin is not linked in the nav — open it via `/admin` on the main site (e.g. `caisbe.org/admin`), which redirects to the admin app.
