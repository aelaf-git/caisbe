from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import health

app = FastAPI(
    title="CAISBE API",
    description="Canada Africa Institute for the Sustainable Built Environment API",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, prefix="/api")


@app.get("/")
async def root() -> dict[str, str]:
    return {"service": "caisbe-api", "docs": "/docs"}
