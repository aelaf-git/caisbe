"""Student learning API split by domain. Paths are unchanged."""

from app.routers.courses.router import router

from app.routers.courses import (  # noqa: F401
    catalog,
    credentials,
    exams,
    learning,
    membership,
    notifications,
)

__all__ = ["router"]
