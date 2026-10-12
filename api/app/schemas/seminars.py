from datetime import datetime

from pydantic import BaseModel, Field


class SeminarOut(BaseModel):
    id: int
    title: str
    description: str
    published: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SeminarCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    published: bool = True
    sort_order: int = 0


class SeminarUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    published: bool | None = None
    sort_order: int | None = None
