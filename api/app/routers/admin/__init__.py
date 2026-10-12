"""Admin API split by domain. Paths stay under /admin."""

from app.routers.admin.router import router

from app.routers.admin import (  # noqa: F401
    analytics,
    assignments,
    catalog,
    contact,
    credentials,
    events,
    jobs,
    membership,
    news,
    operations,
    payments,
    publishing,
    seminars,
    students,
    testimonials,
)

__all__ = ["router"]
