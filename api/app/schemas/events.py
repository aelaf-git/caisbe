from datetime import datetime

from pydantic import BaseModel, Field


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
    event_type: str = Field(default="conference", max_length=64)
    starts_on: datetime
    ends_on: datetime | None = None
    source_name: str | None = Field(default=None, max_length=160)
    source_url: str | None = Field(default=None, max_length=1024)
    report_file_url: str | None = Field(default=None, max_length=1024)
    cpd_hours: float | None = Field(default=None, ge=0, le=500)
    published: bool = False
    featured: bool = False
    sort_order: int = 0


class IndustryEventUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    summary: str | None = Field(default=None, max_length=8000)
    location: str | None = Field(default=None, max_length=255)
    region: str | None = Field(default=None, max_length=120)
    event_type: str | None = Field(default=None, max_length=64)
    starts_on: datetime | None = None
    ends_on: datetime | None = None
    source_name: str | None = Field(default=None, max_length=160)
    source_url: str | None = Field(default=None, max_length=1024)
    report_file_url: str | None = Field(default=None, max_length=1024)
    cpd_hours: float | None = Field(default=None, ge=0, le=500)
    published: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None


class CpdActivityOut(BaseModel):
    id: int
    activity: str
    category: str
    hours_reported: float
    hours_approved: float
    published: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CpdActivityCreateIn(BaseModel):
    activity: str = Field(min_length=1, max_length=255)
    category: str = Field(default="course", max_length=64)
    hours_reported: float = Field(default=0, ge=0, le=500)
    hours_approved: float = Field(default=0, ge=0, le=500)
    published: bool = True
    sort_order: int = 0


class CpdActivityUpdateIn(BaseModel):
    activity: str | None = Field(default=None, min_length=1, max_length=255)
    category: str | None = Field(default=None, max_length=64)
    hours_reported: float | None = Field(default=None, ge=0, le=500)
    hours_approved: float | None = Field(default=None, ge=0, le=500)
    published: bool | None = None
    sort_order: int | None = None
