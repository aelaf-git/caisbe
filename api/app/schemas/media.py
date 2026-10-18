from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class MediaAssetOut(BaseModel):
    id: int
    title: str
    description: str | None = None
    file_url: str | None = None
    cover_url: str | None = None
    external_url: str | None = None
    body: str | None = None
    show_text_panel: bool = True
    eyebrow: str | None = None
    headline: str | None = None
    subheadline: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None
    category: str
    published: bool
    featured: bool
    sort_order: int
    created_at: datetime

    model_config = {"from_attributes": True}


class MediaAssetCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=8000)
    file_url: str | None = Field(default=None, max_length=1024)
    cover_url: str | None = Field(default=None, max_length=1024)
    external_url: str | None = Field(default=None, max_length=1024)
    body: str | None = Field(default=None, max_length=100_000)
    show_text_panel: bool = True
    eyebrow: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=255)
    subheadline: str | None = Field(default=None, max_length=512)
    cta_label: str | None = Field(default=None, max_length=120)
    cta_url: str | None = Field(default=None, max_length=1024)
    category: str = Field(default="magazine", max_length=32)
    published: bool = False
    featured: bool = False
    sort_order: int = 0


class MediaAssetUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = Field(default=None, max_length=8000)
    file_url: str | None = Field(default=None, max_length=1024)
    cover_url: str | None = Field(default=None, max_length=1024)
    external_url: str | None = Field(default=None, max_length=1024)
    body: str | None = Field(default=None, max_length=100_000)
    show_text_panel: bool | None = None
    eyebrow: str | None = Field(default=None, max_length=120)
    headline: str | None = Field(default=None, max_length=255)
    subheadline: str | None = Field(default=None, max_length=512)
    cta_label: str | None = Field(default=None, max_length=120)
    cta_url: str | None = Field(default=None, max_length=1024)
    category: str | None = Field(default=None, max_length=32)
    published: bool | None = None
    featured: bool | None = None
    sort_order: int | None = None


class NewsletterSubscribeIn(BaseModel):
    email: EmailStr


class NewsletterUnsubscribeIn(BaseModel):
    token: str = Field(min_length=8, max_length=200)


class NewsletterSubscriberOut(BaseModel):
    id: int
    email: str
    source: str
    subscribed_at: datetime
    unsubscribed_at: datetime | None = None

    model_config = {"from_attributes": True}


class NewsletterAttachmentIn(BaseModel):
    filename: str = Field(min_length=1, max_length=255)
    file_url: str = Field(min_length=1, max_length=1024)


class NewsletterSendIn(BaseModel):
    subject: str = Field(min_length=1, max_length=255)
    body_html: str = Field(min_length=1, max_length=100_000)
    subscriber_ids: list[int] = Field(min_length=1)
    attachments: list[NewsletterAttachmentIn] = Field(default_factory=list)


class NewsletterSendOut(BaseModel):
    campaign_id: int
    recipient_count: int
    message: str


class HeroSlideOut(BaseModel):
    id: int | str
    title: str
    file_url: str
    media_type: str  # "image" | "video"
    show_text_panel: bool = True
    eyebrow: str | None = None
    headline: str | None = None
    subheadline: str | None = None
    description: str | None = None
    cta_label: str | None = None
    cta_url: str | None = None


class HeroCarouselOut(BaseModel):
    transition_ms: int
    slides: list[HeroSlideOut]


class NewsletterCampaignOut(BaseModel):
    id: int
    subject: str
    recipient_count: int
    sent_at: datetime

    model_config = {"from_attributes": True}
