from datetime import datetime
import re

from pydantic import BaseModel, Field, field_validator


def slugify_title(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower().strip())
    return slug.strip("-")[:240] or "news"


class NewsPostOut(BaseModel):
    id: int
    title: str
    slug: str
    short_description: str | None = None
    long_description: str | None = None
    cover_url: str | None = None
    image_urls: list[str] = Field(default_factory=list)
    video_urls: list[str] = Field(default_factory=list)
    tag: str | None = None
    posted_on: datetime
    published: bool
    featured: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}

    @field_validator("image_urls", "video_urls", mode="before")
    @classmethod
    def _coerce_url_list(cls, value: object) -> list[str]:
        if value is None:
            return []
        if isinstance(value, list):
            return [str(item) for item in value if item]
        return []


class NewsPostCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=280)
    short_description: str | None = Field(default=None, max_length=2000)
    long_description: str | None = Field(default=None, max_length=50000)
    cover_url: str | None = Field(default=None, max_length=1024)
    image_urls: list[str] = Field(default_factory=list)
    video_urls: list[str] = Field(default_factory=list)
    tag: str | None = Field(default=None, max_length=64)
    posted_on: datetime
    published: bool = False
    featured: bool = False
    sort_order: int = 0


class NewsPostUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    slug: str | None = Field(default=None, max_length=280)
    short_description: str | None = Field(default=None, max_length=2000)
    long_description: str | None = Field(default=None, max_length=50000)
    cover_url: str | None = Field(default=None, max_length=1024)
    image_urls: list[str] | None = None
    video_urls: list[str] | None = None
    tag: str | None = Field(default=None, max_length=64)
    posted_on: datetime | None = None
    published: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None
