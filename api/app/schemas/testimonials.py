from datetime import datetime

from pydantic import BaseModel, Field


class TestimonialOut(BaseModel):
    id: int
    quote: str
    name: str
    role: str
    published: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class TestimonialCreateIn(BaseModel):
    quote: str = Field(min_length=1, max_length=4000)
    name: str = Field(min_length=1, max_length=120)
    role: str = Field(min_length=1, max_length=160)
    published: bool = True
    sort_order: int = 0


class TestimonialUpdateIn(BaseModel):
    quote: str | None = Field(default=None, min_length=1, max_length=4000)
    name: str | None = Field(default=None, min_length=1, max_length=120)
    role: str | None = Field(default=None, min_length=1, max_length=160)
    published: bool | None = None
    sort_order: int | None = None
