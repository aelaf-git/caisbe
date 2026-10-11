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



class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    phone: Mapped[str | None] = mapped_column(String(40), nullable=True)
    country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    city: Mapped[str | None] = mapped_column(String(100), nullable=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(32), default="student")
    given_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    family_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(160), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    membership_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    membership_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    membership_status: Mapped[str] = mapped_column(String(32), default="pending")
    profile_completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    failed_login_count: Mapped[int] = mapped_column(Integer, default=0)
    login_locked_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    suspended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    # Portal appearance — per student only (not global AppSetting / admin theme).
    ui_theme: Mapped[str] = mapped_column(String(16), default="light")
    ui_font_size: Mapped[str] = mapped_column(String(8), default="md")
    ui_font_body: Mapped[str] = mapped_column(String(32), default="nunito")
    ui_font_display: Mapped[str] = mapped_column(String(32), default="poppins")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="user")
    lesson_progress: Mapped[list["LessonProgress"]] = relationship(back_populates="user")
    quiz_attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="user")
    certificates: Mapped[list["Certificate"]] = relationship(back_populates="user")
    membership_certificate: Mapped["MembershipCertificate | None"] = relationship(
        back_populates="user",
        uselist=False,
    )
    orders: Mapped[list["Order"]] = relationship(back_populates="user")
    notifications: Mapped[list["Notification"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="user")
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="user",
        foreign_keys="Payment.user_id",
    )
    saved_cards: Mapped[list["SavedCard"]] = relationship(back_populates="user")
    security_questions: Mapped[list["SecurityQuestion"]] = relationship(back_populates="user")
    cart_items: Mapped[list["CartItem"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    password_reset_tokens: Mapped[list["PasswordResetToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    documents: Mapped[list["UserDocument"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    support_threads: Mapped[list["SupportThread"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        foreign_keys="SupportThread.user_id",
    )


class PendingRegistration(Base):
    """Signup held until the student verifies their email. No User row yet."""

    __tablename__ = "pending_registrations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(120))
    phone: Mapped[str] = mapped_column(String(40))
    country: Mapped[str] = mapped_column(String(100))
    city: Mapped[str] = mapped_column(String(100))
    hashed_password: Mapped[str] = mapped_column(String(255))
    given_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    family_name: Mapped[str | None] = mapped_column(String(80), nullable=True)
    address: Mapped[str | None] = mapped_column(String(255), nullable=True)
    organization: Mapped[str | None] = mapped_column(String(160), nullable=True)
    job_title: Mapped[str | None] = mapped_column(String(120), nullable=True)
    membership_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    supporting_document_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    supporting_document_label: Mapped[str | None] = mapped_column(String(160), nullable=True)
    supporting_document_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PasswordResetToken(Base):
    """One-time password reset token hashed at rest."""

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="password_reset_tokens")


class SecurityQuestion(Base):
    __tablename__ = "security_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question: Mapped[str] = mapped_column(String(255))
    answer_hash: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[User] = relationship(back_populates="security_questions")


class LoginEvent(Base):
    """Sign-in success or failure, for the admin Access Control activity list."""

    __tablename__ = "login_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    email: Mapped[str] = mapped_column(String(255), index=True)
    success: Mapped[bool] = mapped_column(Boolean, default=False)
    reason: Mapped[str] = mapped_column(String(64), default="")
    ip_address: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), index=True)

    user: Mapped["User | None"] = relationship(foreign_keys=[user_id])