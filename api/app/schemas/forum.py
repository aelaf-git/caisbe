from datetime import datetime

from pydantic import BaseModel, Field


class ForumBoardSummary(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    member_can_start: bool
    sort_order: int
    thread_count: int = 0
    last_activity_at: datetime | None = None
    last_thread_title: str | None = None


class ForumCategoryOut(BaseModel):
    id: int
    slug: str
    title: str
    sort_order: int
    boards: list[ForumBoardSummary] = Field(default_factory=list)


class ForumThreadSummary(BaseModel):
    id: int
    title: str
    author_name: str
    pinned: bool
    locked: bool
    hidden: bool = False
    reply_count: int = 0
    created_at: datetime
    last_activity_at: datetime


class ForumBoardDetail(BaseModel):
    id: int
    slug: str
    title: str
    description: str
    member_can_start: bool
    category_slug: str
    category_title: str
    threads: list[ForumThreadSummary] = Field(default_factory=list)


class ForumReplyOut(BaseModel):
    id: int
    author_name: str
    body: str
    hidden: bool = False
    created_at: datetime


class ForumThreadDetail(BaseModel):
    id: int
    board_slug: str
    board_title: str
    category_title: str
    title: str
    body: str
    author_name: str
    pinned: bool
    locked: bool
    hidden: bool = False
    member_can_start: bool
    created_at: datetime
    last_activity_at: datetime
    replies: list[ForumReplyOut] = Field(default_factory=list)


class ForumAdminThreadSummary(ForumThreadSummary):
    board_slug: str
    board_title: str
    author_email: str = ""


class ForumAdminThreadDetail(ForumThreadDetail):
    author_email: str = ""


class ForumThreadCreate(BaseModel):
    title: str = Field(min_length=2, max_length=200)
    body: str = Field(min_length=1, max_length=8000)


class ForumReplyCreate(BaseModel):
    body: str = Field(min_length=1, max_length=8000)


class ForumModerateUpdate(BaseModel):
    pinned: bool | None = None
    locked: bool | None = None
    hidden: bool | None = None


class ForumReplyModerateUpdate(BaseModel):
    hidden: bool
