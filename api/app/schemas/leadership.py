from datetime import datetime

from pydantic import BaseModel, Field


class LeadershipPersonOut(BaseModel):
    id: int
    name: str
    role: str
    credentials: str | None = None
    bio: str | None = None
    email: str | None = None
    photo_url: str | None = None
    published: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LeadershipPersonCreateIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=160)
    credentials: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=4000)
    email: str | None = Field(default=None, max_length=255)
    photo_url: str | None = Field(default=None, max_length=500)
    published: bool = True
    sort_order: int = 0


class LeadershipPersonUpdateIn(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: str | None = Field(default=None, min_length=1, max_length=160)
    credentials: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=4000)
    email: str | None = Field(default=None, max_length=255)
    photo_url: str | None = Field(default=None, max_length=500)
    published: bool | None = None
    sort_order: int | None = None
