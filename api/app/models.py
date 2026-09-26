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


class Course(Base):
    __tablename__ = "courses"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column(String(32), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str] = mapped_column(Text)
    slug: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    status: Mapped[str] = mapped_column(String(32), default="draft", index=True)
    cover_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    pass_percent: Mapped[int] = mapped_column(Integer, default=70)
    price_cents: Mapped[int] = mapped_column(Integer, default=9900)
    currency: Mapped[str] = mapped_column(String(8), default="usd")
    # Working copy of details while status is published; portal keeps reading live columns.
    draft_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    has_unpublished_changes: Mapped[bool] = mapped_column(Boolean, default=False)

    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="course")
    chapters: Mapped[list["Chapter"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        order_by="Chapter.sort_order",
    )
    final_exam: Mapped["FinalExam | None"] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        uselist=False,
    )
    certificate_template: Mapped["CertificateTemplate | None"] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
        uselist=False,
    )
    certificates: Mapped[list["Certificate"]] = relationship(back_populates="course")


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_user_course"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="enrolled")
    progress: Mapped[int] = mapped_column(Integer, default=0)
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="enrollments")
    course: Mapped[Course] = relationship(back_populates="enrollments")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    course: Mapped[Course] = relationship(back_populates="chapters")
    lessons: Mapped[list["Lesson"]] = relationship(
        back_populates="chapter",
        cascade="all, delete-orphan",
        order_by="Lesson.sort_order",
    )
    blocks: Mapped[list["ContentBlock"]] = relationship(
        back_populates="chapter",
        cascade="all, delete-orphan",
        order_by="ContentBlock.sort_order",
        foreign_keys="ContentBlock.chapter_id",
    )


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    chapter_id: Mapped[int] = mapped_column(ForeignKey("chapters.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    chapter: Mapped[Chapter] = relationship(back_populates="lessons")
    blocks: Mapped[list["ContentBlock"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
        order_by="ContentBlock.sort_order",
        foreign_keys="ContentBlock.lesson_id",
    )
    progress_records: Mapped[list["LessonProgress"]] = relationship(
        back_populates="lesson",
        cascade="all, delete-orphan",
    )


class Quiz(Base):
    __tablename__ = "quizzes"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255), default="Quiz")

    questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="quiz",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.sort_order",
    )
    blocks: Mapped[list["ContentBlock"]] = relationship(back_populates="quiz")
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="quiz")


class ContentBlock(Base):
    __tablename__ = "content_blocks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    # Topic content uses lesson_id; chapter quizzes/assignments use chapter_id.
    lesson_id: Mapped[int | None] = mapped_column(
        ForeignKey("lessons.id", ondelete="CASCADE"), index=True, nullable=True
    )
    chapter_id: Mapped[int | None] = mapped_column(
        ForeignKey("chapters.id", ondelete="CASCADE"), index=True, nullable=True
    )
    # Media uploads nest under a text or subtopic block.
    parent_id: Mapped[int | None] = mapped_column(
        ForeignKey("content_blocks.id", ondelete="CASCADE"), index=True, nullable=True
    )
    # text, video, pdf, document, subtopic, link, quiz, assignment
    block_type: Mapped[str] = mapped_column(String(32))
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    quiz_id: Mapped[int | None] = mapped_column(ForeignKey("quizzes.id"), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    lesson: Mapped[Lesson | None] = relationship(
        back_populates="blocks", foreign_keys=[lesson_id]
    )
    chapter: Mapped[Chapter | None] = relationship(
        back_populates="blocks", foreign_keys=[chapter_id]
    )
    quiz: Mapped[Quiz | None] = relationship(back_populates="blocks")
    parent: Mapped["ContentBlock | None"] = relationship(
        remote_side=[id],
        back_populates="children",
        foreign_keys=[parent_id],
    )
    children: Mapped[list["ContentBlock"]] = relationship(
        back_populates="parent",
        foreign_keys=[parent_id],
        order_by="ContentBlock.sort_order",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )


class FinalExam(Base):
    __tablename__ = "final_exams"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), unique=True)
    title: Mapped[str] = mapped_column(String(255), default="Final Exam")
    pass_percent: Mapped[int] = mapped_column(Integer, default=70)
    time_limit_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)

    course: Mapped[Course] = relationship(back_populates="final_exam")
    questions: Mapped[list["QuizQuestion"]] = relationship(
        back_populates="final_exam",
        cascade="all, delete-orphan",
        order_by="QuizQuestion.sort_order",
    )
    attempts: Mapped[list["QuizAttempt"]] = relationship(back_populates="final_exam")
    sessions: Mapped[list["ExamSession"]] = relationship(
        back_populates="final_exam",
        cascade="all, delete-orphan",
    )


class ExamSession(Base):
    __tablename__ = "exam_sessions"
    __table_args__ = (UniqueConstraint("user_id", "final_exam_id", name="uq_user_exam_session"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    final_exam_id: Mapped[int] = mapped_column(ForeignKey("final_exams.id", ondelete="CASCADE"), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    order_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    final_exam: Mapped[FinalExam] = relationship(back_populates="sessions")


class QuizQuestion(Base):
    __tablename__ = "quiz_questions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    quiz_id: Mapped[int | None] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=True, index=True)
    final_exam_id: Mapped[int | None] = mapped_column(
        ForeignKey("final_exams.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )
    prompt: Mapped[str] = mapped_column(Text)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    quiz: Mapped[Quiz | None] = relationship(back_populates="questions")
    final_exam: Mapped[FinalExam | None] = relationship(back_populates="questions")
    choices: Mapped[list["QuizChoice"]] = relationship(
        back_populates="question",
        cascade="all, delete-orphan",
        order_by="QuizChoice.sort_order",
    )


class QuizChoice(Base):
    __tablename__ = "quiz_choices"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    question_id: Mapped[int] = mapped_column(ForeignKey("quiz_questions.id", ondelete="CASCADE"), index=True)
    text: Mapped[str] = mapped_column(String(512))
    is_correct: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    question: Mapped[QuizQuestion] = relationship(back_populates="choices")


class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), unique=True)
    title: Mapped[str] = mapped_column(String(255), default="Certificate of Completion")
    body: Mapped[str] = mapped_column(
        Text,
        default="This certifies that {student_name} has successfully completed {course_title}.",
    )

    course: Mapped[Course] = relationship(back_populates="certificate_template")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="lesson_progress")
    lesson: Mapped[Lesson] = relationship(back_populates="progress_records")


class BlockCompletion(Base):
    __tablename__ = "block_completions"
    __table_args__ = (UniqueConstraint("user_id", "content_block_id", name="uq_user_block_completion"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_block_id: Mapped[int] = mapped_column(
        ForeignKey("content_blocks.id", ondelete="CASCADE"), index=True
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship()
    block: Mapped["ContentBlock"] = relationship()


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"
    __table_args__ = (UniqueConstraint("user_id", "content_block_id", name="uq_user_assignment_submission"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_block_id: Mapped[int] = mapped_column(
        ForeignKey("content_blocks.id", ondelete="CASCADE"), index=True
    )
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[str] = mapped_column(String(32), default="under_review")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship()
    block: Mapped["ContentBlock"] = relationship()


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    quiz_id: Mapped[int | None] = mapped_column(ForeignKey("quizzes.id", ondelete="CASCADE"), nullable=True)
    final_exam_id: Mapped[int | None] = mapped_column(
        ForeignKey("final_exams.id", ondelete="CASCADE"),
        nullable=True,
    )
    score: Mapped[int] = mapped_column(Integer, default=0)
    passed: Mapped[bool] = mapped_column(Boolean, default=False)
    answers_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="quiz_attempts")
    quiz: Mapped[Quiz | None] = relationship(back_populates="attempts")
    final_exam: Mapped[FinalExam | None] = relationship(back_populates="attempts")


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_user_course_cert"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    certificate_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="certificates")
    course: Mapped[Course] = relationship(back_populates="certificates")


class MembershipCertificate(Base):
    __tablename__ = "membership_certificates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    membership_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    certificate_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="membership_certificate")


class AppSetting(Base):
    __tablename__ = "app_settings"

    key: Mapped[str] = mapped_column(String(64), primary_key=True)
    value: Mapped[str] = mapped_column(Text)


class MediaAsset(Base):
    __tablename__ = "media_assets"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str] = mapped_column(String(1024))
    cover_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
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

    sent_by: Mapped[User | None] = relationship()


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


class CartItem(Base):
    __tablename__ = "cart_items"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_cart_user_course"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="cart_items")
    course: Mapped["Course"] = relationship()


class Promotion(Base):
    __tablename__ = "promotions"

    id: Mapped[int] = mapped_column(primary_key=True)
    code: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    description: Mapped[str] = mapped_column(String(255), default="")
    percent_off: Mapped[int | None] = mapped_column(Integer, nullable=True)
    amount_off_cents: Mapped[int | None] = mapped_column(Integer, nullable=True)
    complimentary: Mapped[bool] = mapped_column(Boolean, default=False)
    max_redemptions: Mapped[int | None] = mapped_column(Integer, nullable=True)
    redemption_count: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    course: Mapped["Course | None"] = relationship()
    orders: Mapped[list["Order"]] = relationship(back_populates="promotion")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    subtotal_cents: Mapped[int] = mapped_column(Integer, default=0)
    discount_cents: Mapped[int] = mapped_column(Integer, default=0)
    total_cents: Mapped[int] = mapped_column(Integer, default=0)
    amount_paid_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="usd")
    promotion_id: Mapped[int | None] = mapped_column(ForeignKey("promotions.id", ondelete="SET NULL"), nullable=True)
    promo_code: Mapped[str | None] = mapped_column(String(40), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="orders")
    promotion: Mapped[Promotion | None] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    invoices: Mapped[list["Invoice"]] = relationship(back_populates="order", cascade="all, delete-orphan")
    payments: Mapped[list["Payment"]] = relationship(back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="RESTRICT"))
    title: Mapped[str] = mapped_column(String(255))
    unit_price_cents: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    order: Mapped[Order] = relationship(back_populates="items")
    course: Mapped[Course] = relationship()


class Invoice(Base):
    __tablename__ = "invoices"

    id: Mapped[int] = mapped_column(primary_key=True)
    number: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    bill_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    period_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    period_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    amount_paid_cents: Mapped[int] = mapped_column(Integer, default=0)
    balance_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="open")

    order: Mapped[Order] = relationship(back_populates="invoices")
    user: Mapped[User] = relationship(back_populates="invoices")
    payments: Mapped[list["Payment"]] = relationship(back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(primary_key=True)
    order_id: Mapped[int] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    invoice_id: Mapped[int | None] = mapped_column(ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(32), default="stripe")
    stripe_session_id: Mapped[str | None] = mapped_column(String(255), nullable=True, index=True)
    stripe_payment_intent_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    amount_cents: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="pending")
    receipt_printed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    reviewed_by_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    order: Mapped[Order] = relationship(back_populates="payments")
    invoice: Mapped[Invoice | None] = relationship(back_populates="payments")
    user: Mapped[User] = relationship(back_populates="payments", foreign_keys=[user_id])
    reviewed_by: Mapped[User | None] = relationship(foreign_keys=[reviewed_by_id])


class SavedCard(Base):
    __tablename__ = "saved_cards"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    stripe_payment_method_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    brand: Mapped[str] = mapped_column(String(32), default="card")
    last4: Mapped[str] = mapped_column(String(4))
    exp_month: Mapped[int] = mapped_column(Integer)
    exp_year: Mapped[int] = mapped_column(Integer)
    first_name: Mapped[str] = mapped_column(String(80), default="")
    last_name: Mapped[str] = mapped_column(String(80), default="")
    is_default: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(back_populates="saved_cards")


class SecurityQuestion(Base):
    __tablename__ = "security_questions"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    question: Mapped[str] = mapped_column(String(255))
    answer_hash: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    user: Mapped[User] = relationship(back_populates="security_questions")


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
    membership_status: Mapped[str] = mapped_column(String(32), default="pending")
    membership_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User | None] = relationship()


class IndustryEvent(Base):
    """Facility management / built-environment events shown on the public calendar."""

    __tablename__ = "industry_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    region: Mapped[str | None] = mapped_column(String(120), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), default="conference", index=True)
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


class JobPosting(Base):
    """CAISBE job board listings with manual publish and expiry dates."""

    __tablename__ = "job_postings"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    company: Mapped[str | None] = mapped_column(String(160), nullable=True)
    location: Mapped[str | None] = mapped_column(String(255), nullable=True)
    employment_type: Mapped[str] = mapped_column(String(64), default="full-time")
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    apply_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    attachment_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    source_label: Mapped[str | None] = mapped_column(String(64), nullable=True)
    posted_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    expires_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

class CpdActivity(Base):
    """CPD activities listed on Professional Development (courses, seminars, events)."""

    __tablename__ = "cpd_activities"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    activity: Mapped[str] = mapped_column(String(255))
    category: Mapped[str] = mapped_column(String(64), default="course", index=True)
    hours_reported: Mapped[float] = mapped_column(Float, default=0.0)
    hours_approved: Mapped[float] = mapped_column(Float, default=0.0)
    published: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )