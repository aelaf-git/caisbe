from datetime import datetime

from pydantic import BaseModel, Field


class NotificationOut(BaseModel):
    id: int
    title: str
    body: str
    kind: str
    link: str | None = None
    read_at: datetime | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationListOut(BaseModel):
    unread_count: int
    items: list[NotificationOut]


class AdminNotificationSendIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str = Field(min_length=1, max_length=8000)
    kind: str = Field(default="announcement", pattern="^(announcement|message|holiday)$")
    link: str | None = Field(default=None, max_length=255)
    audience: str = Field(default="all_students", pattern="^(all_students)$")


class AdminNotificationBroadcastOut(BaseModel):
    id: int
    title: str
    body: str
    kind: str
    link: str | None = None
    audience: str
    recipient_count: int
    created_at: datetime
    sent_by_name: str | None = None

    model_config = {"from_attributes": True}


class AdminNotificationSendOut(BaseModel):
    broadcast_id: int
    recipient_count: int
    message: str
