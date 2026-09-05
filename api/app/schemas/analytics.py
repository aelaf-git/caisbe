from datetime import datetime

from pydantic import BaseModel, Field


class SiteVisitIn(BaseModel):
    path: str = Field(default="/", max_length=512)
    referrer: str | None = Field(default=None, max_length=1024)
    language: str | None = Field(default=None, max_length=64)
    timezone: str | None = Field(default=None, max_length=64)
    city: str | None = Field(default=None, max_length=120)


class SiteVisitOut(BaseModel):
    id: int
    path: str
    ip_address: str
    country: str | None = None
    city: str | None = None
    referrer: str | None = None
    user_agent: str | None = None
    language: str | None = None
    timezone: str | None = None
    visited_at: datetime

    model_config = {"from_attributes": True}


class SiteVisitPathStatOut(BaseModel):
    path: str
    views: int


class SiteVisitCountryStatOut(BaseModel):
    country: str
    views: int


class SiteVisitStatsOut(BaseModel):
    total_views: int
    unique_visitors: int
    landing_views: int
    landing_unique_visitors: int
    views_today: int
    unique_today: int
    views_last_7_days: int
    unique_last_7_days: int
    top_paths: list[SiteVisitPathStatOut] = Field(default_factory=list)
    top_countries: list[SiteVisitCountryStatOut] = Field(default_factory=list)


class AdminDashboardOut(BaseModel):
    students: int
    courses_total: int
    courses_published: int
    courses_draft: int
    total_enrollments: int
    enrollments_in_progress: int
    enrollments_completed: int
    completion_rate: int
    certificates: int
    newsletter_subscribers: int
    newsletters_sent: int
    magazines_published: int
    site_views_today: int
    site_unique_today: int
    landing_views: int
    landing_unique_visitors: int
