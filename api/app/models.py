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
    # Block copy/paste in the student portal; soft hide when tab is inactive.
    content_protection: Mapped[bool] = mapped_column(Boolean, default=True)
    # Working copy of details while status is published; portal keeps reading live columns.
    draft_meta: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    has_unpublished_changes: Mapped[bool] = mapped_column(Boolean, default=False)

    enrollments: Mapped[list["Enrollment"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )
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
    certificates: Mapped[list["Certificate"]] = relationship(
        back_populates="course",
        cascade="all, delete-orphan",
    )


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_user_course"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
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
    # Used by assignment blocks. Other block types leave these empty.
    points_possible: Mapped[int | None] = mapped_column(Integer, nullable=True)
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
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
    # NULL = show the full bank; otherwise sample this many questions per attempt.
    questions_to_appear: Mapped[int | None] = mapped_column(Integer, nullable=True)
    secure_mode: Mapped[bool] = mapped_column(Boolean, default=True)
    max_integrity_violations: Mapped[int] = mapped_column(Integer, default=3)

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
    integrity_events: Mapped[list["ExamIntegrityEvent"]] = relationship(
        back_populates="final_exam",
        cascade="all, delete-orphan",
    )


class ExamSession(Base):
    __tablename__ = "exam_sessions"
    __table_args__ = (UniqueConstraint("user_id", "final_exam_id", name="uq_user_exam_session"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    final_exam_id: Mapped[int] = mapped_column(ForeignKey("final_exams.id", ondelete="CASCADE"), index=True)
    # Null until the student actually begins (after secure precheck when enabled).
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    order_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    secure_ok_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    violation_count: Mapped[int] = mapped_column(Integer, default=0)
    locked_out_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    final_exam: Mapped[FinalExam] = relationship(back_populates="sessions")
    integrity_events: Mapped[list["ExamIntegrityEvent"]] = relationship(back_populates="exam_session")


class ExamIntegrityEvent(Base):
    __tablename__ = "exam_integrity_events"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    final_exam_id: Mapped[int] = mapped_column(ForeignKey("final_exams.id", ondelete="CASCADE"), index=True)
    exam_session_id: Mapped[int | None] = mapped_column(
        ForeignKey("exam_sessions.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    phase: Mapped[str] = mapped_column(String(16))  # pre | live | post
    event_type: Mapped[str] = mapped_column(String(64))
    detail_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    final_exam: Mapped[FinalExam] = relationship(back_populates="integrity_events")
    exam_session: Mapped[ExamSession | None] = relationship(back_populates="integrity_events")


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
    score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    graded_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    graded_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User] = relationship(foreign_keys=[user_id])
    graded_by: Mapped[User | None] = relationship(foreign_keys=[graded_by_id])
    block: Mapped["ContentBlock"] = relationship()
    attempts: Mapped[list["AssignmentAttempt"]] = relationship(
        back_populates="submission",
        cascade="all, delete-orphan",
        order_by="AssignmentAttempt.submitted_at",
    )


class AssignmentAttempt(Base):
    __tablename__ = "assignment_attempts"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("assignment_submissions.id", ondelete="CASCADE"), index=True
    )
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    submission: Mapped["AssignmentSubmission"] = relationship(back_populates="attempts")


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
    membership_type: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    membership_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    certificate_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship(back_populates="membership_certificate")


class MembershipCertificateType(Base):
    """One certificate template + price per membership category."""

    __tablename__ = "membership_certificate_types"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    membership_type: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    label: Mapped[str] = mapped_column(String(120))
    title: Mapped[str] = mapped_column(String(255), default="Certificate of Membership")
    body: Mapped[str] = mapped_column(
        Text,
        default="is a recognised member of {issued_by}, admitted on {issued_at}.",
    )
    price_cents: Mapped[int] = mapped_column(Integer, default=0)
    currency: Mapped[str] = mapped_column(String(8), default="cad")
    # NULL = lifetime (student). Non-student types use months (default 12).
    validity_months: Mapped[int | None] = mapped_column(Integer, nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

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
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="SET NULL"), nullable=True)
    membership_type: Mapped[str | None] = mapped_column(String(40), nullable=True)
    membership_kind: Mapped[str | None] = mapped_column(String(20), nullable=True)
    title: Mapped[str] = mapped_column(String(255))
    unit_price_cents: Mapped[int] = mapped_column(Integer)
    quantity: Mapped[int] = mapped_column(Integer, default=1)

    order: Mapped[Order] = relationship(back_populates="items")
    course: Mapped[Course | None] = relationship()


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
    details: Mapped[str | None] = mapped_column(Text, nullable=True)
    membership_status: Mapped[str] = mapped_column(String(32), default="pending")
    membership_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped[User | None] = relationship()


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
    cover_url: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    image_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    video_urls: Mapped[list | None] = mapped_column(JSON, nullable=True)
    tag: Mapped[str | None] = mapped_column(String(64), nullable=True)
    posted_on: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    published: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    featured: Mapped[bool] = mapped_column(Boolean, default=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


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

    sent_by: Mapped[User | None] = relationship()


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