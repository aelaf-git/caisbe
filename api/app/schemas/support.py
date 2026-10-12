from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field

SupportKind = Literal["question", "issue", "general"]
SupportStatus = Literal["open", "waiting_admin", "waiting_student", "closed"]


class SupportMessageOut(BaseModel):
    id: int
    thread_id: int
    sender_user_id: int
    sender_name: str = ""
    body: str
    is_from_admin: bool
    created_at: datetime
    read_at: datetime | None = None

    model_config = {"from_attributes": True}


class SupportThreadOut(BaseModel):
    id: int
    user_id: int
    student_name: str = ""
    student_email: str = ""
    subject: str
    kind: SupportKind
    status: SupportStatus
    created_at: datetime
    updated_at: datetime
    last_message_at: datetime
    unread_count: int = 0
    last_preview: str = ""
    messages: list[SupportMessageOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class SupportThreadCreate(BaseModel):
    subject: str = Field(min_length=2, max_length=255)
    kind: SupportKind = "question"
    body: str = Field(min_length=1, max_length=8000)


class SupportMessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=8000)


class SupportThreadStatusUpdate(BaseModel):
    status: SupportStatus


class SupportUnreadOut(BaseModel):
    unread_count: int
