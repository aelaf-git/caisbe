from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


CONTACT_STATUSES = {"new", "read", "replied", "archived"}


class ContactMessageIn(BaseModel):
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    company: str | None = Field(default=None, max_length=160)
    job_title: str | None = Field(default=None, max_length=120)
    phone: str | None = Field(default=None, max_length=40)
    email: EmailStr
    help_topic: str | None = Field(default=None, max_length=255)
    comments: str = Field(min_length=1, max_length=8000)


class ContactMessageOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    company: str | None
    job_title: str | None
    phone: str | None
    email: str
    help_topic: str | None
    comments: str
    status: str
    admin_reply: str | None
    replied_at: datetime | None
    replied_by_admin_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ContactMessageStatusIn(BaseModel):
    status: str = Field(min_length=1, max_length=32)


class ContactMessageReplyIn(BaseModel):
    subject: str = Field(default="Re: Your message to CAISBE", min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=8000)
