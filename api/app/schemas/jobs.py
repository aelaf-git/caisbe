from datetime import datetime

from pydantic import BaseModel, Field


class JobPostingOut(BaseModel):
    id: int
    title: str
    company: str | None = None
    location: str | None = None
    employment_type: str
    summary: str | None = None
    description: str | None = None
    apply_url: str | None = None
    attachment_url: str | None = None
    source_label: str | None = None
    posted_on: datetime
    expires_on: datetime
    published: bool
    featured: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime
    is_expired: bool = False

    model_config = {"from_attributes": True}


class JobPostingCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    company: str | None = Field(default=None, max_length=160)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str = Field(default="full-time", max_length=64)
    summary: str | None = Field(default=None, max_length=4000)
    description: str | None = Field(default=None, max_length=20000)
    apply_url: str | None = Field(default=None, max_length=1024)
    attachment_url: str | None = Field(default=None, max_length=1024)
    source_label: str | None = Field(default=None, max_length=64)
    posted_on: datetime
    expires_on: datetime
    published: bool = True
    featured: bool = False
    sort_order: int = 0


class JobPostingUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    company: str | None = Field(default=None, max_length=160)
    location: str | None = Field(default=None, max_length=255)
    employment_type: str | None = Field(default=None, max_length=64)
    summary: str | None = Field(default=None, max_length=4000)
    description: str | None = Field(default=None, max_length=20000)
    apply_url: str | None = Field(default=None, max_length=1024)
    attachment_url: str | None = Field(default=None, max_length=1024)
    source_label: str | None = Field(default=None, max_length=64)
    posted_on: datetime | None = None
    expires_on: datetime | None = None
    published: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None
