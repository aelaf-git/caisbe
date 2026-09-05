from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class MediaAssetOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    file_url: str
    cover_url: str | None = None
    category: str
    published: bool
    featured: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaAssetCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    file_url: str = Field(min_length=1, max_length=1024)
    cover_url: str | None = Field(default=None, max_length=1024)
    category: str = Field(default="magazine", max_length=32)
    published: bool = False
    featured: bool = False
    sort_order: int = 0


class MediaAssetUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=4000)
    file_url: str | None = Field(default=None, min_length=1, max_length=1024)
    cover_url: str | None = Field(default=None, max_length=1024)
    published: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None


class NewsletterSubscribeIn(BaseModel):
    email: EmailStr
    full_name: str | None = Field(default=None, max_length=120)


class NewsletterSubscriberOut(BaseModel):
    id: int
    email: str
    full_name: str | None = None
    source: str
    subscribed_at: datetime
    unsubscribed_at: datetime | None = None

    model_config = {"from_attributes": True}


class NewsletterSendIn(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    body_html: str = Field(min_length=1, max_length=100_000)
    test_email: EmailStr | None = None


class NewsletterSendOut(BaseModel):
    campaign_id: int
    recipient_count: int
    message: str


class NewsletterCampaignOut(BaseModel):
    id: int
    subject: str
    recipient_count: int
    sent_at: datetime

    model_config = {"from_attributes": True}
