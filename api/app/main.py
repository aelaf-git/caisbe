from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app import models  # noqa: F401 — register SQLAlchemy models
from app.config import settings
from app.db import Base, SessionLocal, engine
from app.migrate import ensure_sqlite_columns
from app.routers import admin, auth, courses, health
from app.seed import seed_admin


@asynccontextmanager
async def lifespan(_: FastAPI):
    Base.metadata.create_all(bind=engine)
    ensure_sqlite_columns(engine)
    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    db = SessionLocal()
    try:
        seed_admin(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="CAISBE API",
    description="Canada Africa Institute for the Sustainable Built Environment API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")
app.include_router(auth.router, prefix="/api")
app.include_router(courses.router, prefix="/api")
app.include_router(admin.router, prefix="/api")

upload_path = Path(settings.upload_dir)
upload_path.mkdir(parents=True, exist_ok=True)
app.mount("/api/uploads", StaticFiles(directory=str(upload_path)), name="uploads")


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "caisbe-api", "docs": "/docs"}
