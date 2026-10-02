from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

EventType = Literal["calendar", "expo", "conferences"]
ALLOWED_EVENT_TYPES = {"calendar", "expo", "conferences"}


def normalize_event_type(value: str | None) -> str:
    raw = (value or "calendar").strip().lower() or "calendar"
    if raw in ALLOWED_EVENT_TYPES:
        return raw
    if raw in {"forum"}:
        return "expo"
    if raw in {"conference", "webinar", "seminar", "summit"}:
        return "conferences"
    return "calendar"


class IndustryEventOut(BaseModel):
    id: int
    title: str
    summary: str | None = None
    location: str | None = None
    region: str | None = None
    event_type: str
    starts_on: datetime
    ends_on: datetime | None = None
    source_name: str | None = None
    source_url: str | None = None
    report_file_url: str | None = None
    cpd_hours: float | None = None
    published: bool
    featured: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class IndustryEventCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    summary: str | None = Field(default=None, max_length=8000)
    location: str | None = Field(default=None, max_length=255)
    region: str | None = Field(default=None, max_length=120)
    event_type: EventType = "calendar"
    starts_on: datetime
    ends_on: datetime | None = None
    source_name: str | None = Field(default=None, max_length=160)
    source_url: str | None = Field(default=None, max_length=1024)
    report_file_url: str | None = Field(default=None, max_length=1024)
    cpd_hours: float | None = Field(default=None, ge=0, le=500)
    published: bool = False
    featured: bool = False
    sort_order: int = 0

    @field_validator("event_type", mode="before")
    @classmethod
    def _coerce_event_type(cls, value: object) -> str:
        return normalize_event_type(str(value) if value is not None else None)


class IndustryEventUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = Field(default=None, max_length=8000)
    location: str | None = Field(default=None, max_length=255)
    region: str | None = Field(default=None, max_length=120)
    event_type: EventType | None = None
    starts_on: datetime | None = None
    ends_on: datetime | None = None
    source_name: str | None = Field(default=None, max_length=160)
    source_url: str | None = Field(default=None, max_length=1024)
    report_file_url: str | None = Field(default=None, max_length=1024)
    cpd_hours: float | None = Field(default=None, ge=0, le=500)
    published: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None

    @field_validator("event_type", mode="before")
    @classmethod
    def _coerce_event_type(cls, value: object) -> str | None:
        if value is None:
            return None
        return normalize_event_type(str(value))
