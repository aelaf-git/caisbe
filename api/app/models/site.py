from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base



class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Uploaded file (magazine PDF, hero media, podcast audio). Optional for link channels.
    file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # External watch/listen URL (YouTube, Spotify, Apple Podcasts, etc.).
    external_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # Full blog post body (plain text).
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    # Homepage hero panel (unused for other media categories).
    show_text_panel: Mapped[bool] = mapped_column(Boolean, default=True)
    eyebrow: Mapped[str | None] = mapped_column(String(120), nullable=True)
    headline: Mapped[str | None] = mapped_column(String(255), nullable=True)
    subheadline: Mapped[str | None] = mapped_column(String(512), nullable=True)
    cta_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cta_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    # hero | magazine | youtube | podcast | blog
    category: Mapped[str] = mapped_column(String(32), default="magazine", index=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class NewsletterSubscriber(Base):
    __tablename__ = "newsletter_subscribers"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    source: Mapped[str] = mapped_column(String(64), default="website")
    subscribed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    unsubscribed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class NewsletterCampaign(Base):
    __tablename__ = "newsletter_campaigns"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    subject: Mapped[str] = mapped_column(String(255))
    body_html: Mapped[str] = mapped_column(Text)
    recipient_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    sent_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)

    sent_by: Mapped["User | None"] = relationship()


class SiteVisit(Base):
    __tablename__ = "site_visits"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    path: Mapped[str] = mapped_column(String(512), index=True)
    ip_address: Mapped[str] = mapped_column(String(64), index=True)
    country: Mapped[str | None] = mapped_column(String(64), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    referrer: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    user_agent: Mapped[str | None] = mapped_column(String(512), nullable=True)
    language: Mapped[str | None] = mapped_column(String(64), nullable=True)
    timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)


class MembershipApplication(Base):
    __tablename__ = "membership_applications"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(40))
    country: Mapped[str] = mapped_column(String(100))
    city: Mapped[str] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(160), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    membership_type: Mapped[str] = mapped_column(String(40))
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    membership_status: Mapped[str] = mapped_column(String(32), default="pending")
    membership_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User | None"] = relationship()


class UserDocument(Base):
    """Supporting documents attached on the student manage-profile page."""

    __tablename__ = "user_documents"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    label: Mapped[str] = mapped_column(String(160), default="Supporting document")
    file_name: Mapped[str] = mapped_column(String(255))
    file_url: Mapped[str] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="documents")


class IndustryEvent(Base):
    """Facility management / built-environment events shown on the public calendar."""

    __tablename__ = "industry_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), default="calendar", index=True)
    starts_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    ends_on: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    source_name: Mapped[str | None] = mapped_column(String(160), nullable=True)
    source_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    report_file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    cpd_hours: Mapped[float | None] = mapped_column(Float, nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class NewsPost(Base):
    """Admin-published news and announcements for the public /news pages."""

    __tablename__ = "news_posts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    slug: Mapped[str] = mapped_column(String(280), unique=True, index=True)
    short_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    long_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    external_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    cover_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    image_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    video_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tag: Mapped[str | None] = mapped_column(String(64), nullable=True)
    # Set for industry RSS imports (e.g. facilities_dive); null for admin-authored posts.
    source_label: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    posted_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Seminar(Base):
    """Seminars listed under certificate programs on the public site."""

    __tablename__ = "seminars"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text)
    # Event details (admin-editable; drive the registration page)
    event_date_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    event_time_label: Mapped[str | None] = mapped_column(String(500), nullable=True)
    event_format_label: Mapped[str | None] = mapped_column(String(500), nullable=True)
    event_starts_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    registration_closes_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    registration_enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    member_price_cents: Mapped[int] = mapped_column(Integer, default=5000)
    non_member_price_cents: Mapped[int] = mapped_column(Integer, default=7500)
    student_price_cents: Mapped[int] = mapped_column(Integer, default=4000)
    capacity_in_person: Mapped[int | None] = mapped_column(Integer, nullable=True)
    capacity_virtual: Mapped[int | None] = mapped_column(Integer, nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    registrations: Mapped[list["SeminarRegistration"]] = relationship(back_populates="seminar")
    access_tokens: Mapped[list["SeminarAccessToken"]] = relationship(back_populates="seminar")


class SeminarAccessToken(Base):
    """Email magic-link gate before the seminar registration form unlocks."""

    __tablename__ = "seminar_access_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    seminar_id: Mapped[int] = mapped_column(ForeignKey("seminars.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    seminar: Mapped["Seminar"] = relationship(back_populates="access_tokens")


class SeminarRegistration(Base):
    """Paid or pending seminar registration submitted after email verification."""

    __tablename__ = "seminar_registrations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    seminar_id: Mapped[int] = mapped_column(ForeignKey("seminars.id", ondelete="CASCADE"), index=True)
    # pending_payment | paid | cancelled
    status: Mapped[str] = mapped_column(String(32), default="pending_payment", index=True)
    first_name: Mapped[str] = mapped_column(String(120))
    last_name: Mapped[str] = mapped_column(String(120))
    preferred_name: Mapped[str | None] = mapped_column(String(120), nullable=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    phone: Mapped[str] = mapped_column(String(60))
    job_title: Mapped[str] = mapped_column(String(160))
    company: Mapped[str] = mapped_column(String(200))
    city: Mapped[str] = mapped_column(String(120))
    state_province: Mapped[str] = mapped_column(String(120))
    country: Mapped[str] = mapped_column(String(120))
    position: Mapped[str] = mapped_column(String(120))
    position_other: Mapped[str | None] = mapped_column(String(160), nullable=True)
    # association_member | non_member | student
    membership_status: Mapped[str] = mapped_column(String(40))
    member_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    earning_ceu: Mapped[bool] = mapped_column(Boolean, default=False)
    designations: Mapped[str | None] = mapped_column(String(500), nullable=True)
    # in_person | virtual
    attendance: Mapped[str] = mapped_column(String(32))
    accommodations: Mapped[str | None] = mapped_column(Text, nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="usd")
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    seminar: Mapped["Seminar"] = relationship(back_populates="registrations")


class Testimonial(Base):
    """Quotes shown on the public homepage."""

    __tablename__ = "testimonials"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quote: Mapped[str] = mapped_column(Text)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(160))
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class LeadershipPerson(Base):
    """People shown in the About page leadership section."""

    __tablename__ = "leadership_people"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(160))
    credentials: Mapped[str | None] = mapped_column(String(255), nullable=True)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    photo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class SupportThread(Base):
    """Student ↔ admin support conversation (portal messaging)."""

    __tablename__ = "support_threads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    subject: Mapped[str] = mapped_column(String(255))
    # question | issue | general
    kind: Mapped[str] = mapped_column(String(32), default="question", index=True)
    # open | waiting_admin | waiting_student | closed
    status: Mapped[str] = mapped_column(String(32), default="open", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    last_message_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    user: Mapped["User"] = relationship(
        back_populates="support_threads",
        foreign_keys=[user_id],
    )
    messages: Mapped[list["SupportMessage"]] = relationship(
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="SupportMessage.id",
    )


class SupportMessage(Base):
    __tablename__ = "support_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("support_threads.id", ondelete="CASCADE"),
        index=True,
    )
    sender_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    body: Mapped[str] = mapped_column(Text)
    is_from_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    thread: Mapped["SupportThread"] = relationship(back_populates="messages")
    sender: Mapped["User"] = relationship(foreign_keys=[sender_user_id])


class ContactMessage(Base):
    """Public Contact Us form submissions for admin review and reply."""

    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(80))
    last_name: Mapped[str] = mapped_column(String(80))
    company: Mapped[str | None] = mapped_column(String(160), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    email: Mapped[str] = mapped_column(String(255), index=True)
    help_topic: Mapped[str | None] = mapped_column(String(255), nullable=True)
    comments: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(32), default="new", index=True)
    admin_reply: Mapped[str | None] = mapped_column(Text, nullable=True)
    replied_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    replied_by_admin_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Notification(Base):
    """In-app student notifications (course removals, admin messages, etc.)."""

    __tablename__ = "notifications"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(40), default="info")
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    read_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="notifications")


class NotificationBroadcast(Base):
    """Admin-sent announcement/message log (in-app notifications to members)."""

    __tablename__ = "notification_broadcasts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(40), default="announcement")
    link: Mapped[str | None] = mapped_column(String(255), nullable=True)
    audience: Mapped[str] = mapped_column(String(40), default="all_students")
    recipient_count: Mapped[int] = mapped_column(Integer, default=0)
    sent_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    sent_by: Mapped["User | None"] = relationship()


class JobPosting(Base):
    """CAISBE job board listings (manual and auto-synced) with expiry dates."""

    __tablename__ = "job_postings"
    __table_args__ = (
        UniqueConstraint("source_label", "external_id", name="uq_job_source_external"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(160), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(64), default="full-time")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    apply_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    external_id: Mapped[str | None] = mapped_column(String(160), nullable=True, index=True)
    posted_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    expires_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class ForumCategory(Base):
    """Top-level discussion forum bar (for example, Academic Support)."""

    __tablename__ = "forum_categories"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    boards: Mapped[list["ForumBoard"]] = relationship(
        back_populates="category",
        cascade="all, delete-orphan",
        order_by="ForumBoard.sort_order",
    )


class ForumBoard(Base):
    """A discussion board inside a forum category."""

    __tablename__ = "forum_boards"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    category_id: Mapped[int] = mapped_column(
        ForeignKey("forum_categories.id", ondelete="CASCADE"),
        index=True,
    )
    slug: Mapped[str] = mapped_column(String(80), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(160))
    description: Mapped[str] = mapped_column(Text, default="")
    member_can_start: Mapped[bool] = mapped_column(Boolean, default=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    category: Mapped["ForumCategory"] = relationship(back_populates="boards")
    threads: Mapped[list["ForumThread"]] = relationship(
        back_populates="board",
        cascade="all, delete-orphan",
    )


class ForumThread(Base):
    """A discussion started on a forum board."""

    __tablename__ = "forum_threads"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    board_id: Mapped[int] = mapped_column(ForeignKey("forum_boards.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(200))
    body: Mapped[str] = mapped_column(Text)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )
    last_activity_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        index=True,
    )

    board: Mapped["ForumBoard"] = relationship(back_populates="threads")
    author: Mapped["User | None"] = relationship(foreign_keys=[author_id])
    replies: Mapped[list["ForumReply"]] = relationship(
        back_populates="thread",
        cascade="all, delete-orphan",
        order_by="ForumReply.created_at, ForumReply.id",
    )


class ForumReply(Base):
    __tablename__ = "forum_replies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    thread_id: Mapped[int] = mapped_column(
        ForeignKey("forum_threads.id", ondelete="CASCADE"),
        index=True,
    )
    author_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    body: Mapped[str] = mapped_column(Text)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    thread: Mapped["ForumThread"] = relationship(back_populates="replies")
    author: Mapped["User | None"] = relationship(foreign_keys=[author_id])


class SitePage(Base):
    """Editable public landing page. A parent makes this a subpage."""

    __tablename__ = "site_pages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("site_pages.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(255))
    menu_label: Mapped[str] = mapped_column(String(120))
    slug: Mapped[str] = mapped_column(String(80))
    path: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text, default="")
    lead: Mapped[str] = mapped_column(Text, default="")
    sections: Mapped[list] = mapped_column(JSON, default=list)
    cta_label: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cta_href: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    show_in_menu: Mapped[bool] = mapped_column(Boolean, default=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)

    parent: Mapped["SitePage | None"] = relationship(
        "SitePage",
        remote_side="SitePage.id",
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["SitePage"]] = relationship(
        "SitePage",
        back_populates="parent",
        foreign_keys=[parent_id],
    )




class ContentTranslation(Base):
    """Hand-written translation of one public record (page, news post, event, ...)."""

    __tablename__ = "content_translations"
    __table_args__ = (
        UniqueConstraint("entity_type", "entity_id", "lang", name="uq_content_translation_entity_lang"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    entity_type: Mapped[str] = mapped_column(String(32), index=True)
    entity_id: Mapped[int] = mapped_column(Integer, index=True)
    lang: Mapped[str] = mapped_column(String(8), index=True)
    fields: Mapped[dict] = mapped_column(JSON, default=dict)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
