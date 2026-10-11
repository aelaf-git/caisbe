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
    exam_fee_cents: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
    retake_fee_cents: Mapped[int] = mapped_column(Integer, default=0, server_default="0")
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
    course_access: Mapped[str] = mapped_column(String(16), default="allowed", server_default="allowed")
    exam_access: Mapped[str] = mapped_column(String(16), default="allowed", server_default="allowed")
    enrolled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="enrollments")
    course: Mapped["Course"] = relationship(back_populates="enrollments")


class Chapter(Base):
    __tablename__ = "chapters"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(255))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    course: Mapped["Course"] = relationship(back_populates="chapters")
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

    chapter: Mapped["Chapter"] = relationship(back_populates="lessons")
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

    lesson: Mapped["Lesson | None"] = relationship(
        back_populates="blocks", foreign_keys=[lesson_id]
    )
    chapter: Mapped["Chapter | None"] = relationship(
        back_populates="blocks", foreign_keys=[chapter_id]
    )
    quiz: Mapped["Quiz | None"] = relationship(back_populates="blocks")
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

    course: Mapped["Course"] = relationship(back_populates="final_exam")
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

    final_exam: Mapped["FinalExam"] = relationship(back_populates="sessions")
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

    final_exam: Mapped["FinalExam"] = relationship(back_populates="integrity_events")
    exam_session: Mapped["ExamSession | None"] = relationship(back_populates="integrity_events")


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

    quiz: Mapped["Quiz | None"] = relationship(back_populates="questions")
    final_exam: Mapped["FinalExam | None"] = relationship(back_populates="questions")
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

    question: Mapped["QuizQuestion"] = relationship(back_populates="choices")


class CertificateTemplate(Base):
    __tablename__ = "certificate_templates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), unique=True)
    title: Mapped[str] = mapped_column(String(255), default="Certificate of Completion")
    body: Mapped[str] = mapped_column(
        Text,
        default="This certifies that {student_name} has successfully completed {course_title}.",
    )
    # Empty means the certificate prints the live course title.
    program_name: Mapped[str | None] = mapped_column(String(255), nullable=True)

    course: Mapped["Course"] = relationship(back_populates="certificate_template")


class LessonProgress(Base):
    __tablename__ = "lesson_progress"
    __table_args__ = (UniqueConstraint("user_id", "lesson_id", name="uq_user_lesson"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    lesson_id: Mapped[int] = mapped_column(ForeignKey("lessons.id", ondelete="CASCADE"), index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="lesson_progress")
    lesson: Mapped["Lesson"] = relationship(back_populates="progress_records")


class BlockCompletion(Base):
    __tablename__ = "block_completions"
    __table_args__ = (UniqueConstraint("user_id", "content_block_id", name="uq_user_block_completion"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    content_block_id: Mapped[int] = mapped_column(
        ForeignKey("content_blocks.id", ondelete="CASCADE"), index=True
    )
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship()
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

    user: Mapped["User"] = relationship(foreign_keys=[user_id])
    graded_by: Mapped["User | None"] = relationship(foreign_keys=[graded_by_id])
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

    user: Mapped["User"] = relationship(back_populates="quiz_attempts")
    quiz: Mapped["Quiz | None"] = relationship(back_populates="attempts")
    final_exam: Mapped["FinalExam | None"] = relationship(back_populates="attempts")


class Certificate(Base):
    __tablename__ = "certificates"
    __table_args__ = (UniqueConstraint("user_id", "course_id", name="uq_user_course_cert"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    certificate_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    user: Mapped["User"] = relationship(back_populates="certificates")
    course: Mapped["Course"] = relationship(back_populates="certificates")


class MembershipCertificate(Base):
    __tablename__ = "membership_certificates"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), unique=True, index=True)
    membership_type: Mapped[str | None] = mapped_column(String(40), nullable=True, index=True)
    membership_number: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    certificate_code: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    issued_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship(back_populates="membership_certificate")


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

