"""Published copy of course content.

Admins edit live rows (chapters, lessons, blocks, quizzes, final exam). Students
only ever read ``Course.published_content``, a JSON snapshot written when the
admin publishes. Deleting curriculum soft-deletes the row so progress records
keep valid keys; the rows are removed for real on the next publish.
"""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from typing import Any, Iterator

from sqlalchemy import or_
from sqlalchemy.orm import Session

from app.models import Chapter, ContentBlock, Course, FinalExam, Lesson, Quiz, QuizQuestion

SNAPSHOT_VERSION = 1


# --- Serialization -----------------------------------------------------------


def _iso(value: datetime | None) -> str | None:
    return value.isoformat() if value is not None else None


def _parse_dt(value: Any) -> datetime | None:
    if not value:
        return None
    if isinstance(value, datetime):
        return value
    parsed = datetime.fromisoformat(str(value))
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


def _serialize_question(question: QuizQuestion) -> dict[str, Any]:
    return {
        "id": question.id,
        "prompt": question.prompt,
        "sort_order": question.sort_order,
        "choices": [
            {
                "id": choice.id,
                "text": choice.text,
                "is_correct": bool(choice.is_correct),
                "sort_order": choice.sort_order,
            }
            for choice in question.choices
        ],
    }


def _serialize_quiz(quiz: Quiz | None) -> dict[str, Any] | None:
    if quiz is None:
        return None
    return {
        "id": quiz.id,
        "title": quiz.title,
        "questions": [_serialize_question(question) for question in quiz.questions],
    }


def _serialize_block(block: ContentBlock) -> dict[str, Any]:
    return {
        "id": block.id,
        "block_type": block.block_type,
        "title": block.title,
        "body": block.body,
        "url": block.url,
        "label": block.label,
        "parent_id": block.parent_id,
        "sort_order": block.sort_order,
        "points_possible": block.points_possible,
        "due_at": _iso(block.due_at),
        "quiz_id": block.quiz_id,
        "quiz": _serialize_quiz(block.quiz) if block.block_type == "quiz" else None,
    }


def _serialize_lesson(lesson: Lesson) -> dict[str, Any]:
    return {
        "id": lesson.id,
        "title": lesson.title,
        "body": lesson.body,
        "sort_order": lesson.sort_order,
        "blocks": [_serialize_block(block) for block in lesson.blocks],
    }


def _serialize_chapter(chapter: Chapter) -> dict[str, Any]:
    return {
        "id": chapter.id,
        "title": chapter.title,
        "sort_order": chapter.sort_order,
        "lessons": [_serialize_lesson(lesson) for lesson in chapter.lessons],
        "blocks": [_serialize_block(block) for block in chapter.blocks],
    }


def _serialize_exam(exam: FinalExam | None) -> dict[str, Any] | None:
    if exam is None:
        return None
    return {
        "id": exam.id,
        "title": exam.title,
        "pass_percent": exam.pass_percent,
        "time_limit_minutes": exam.time_limit_minutes,
        "questions_to_appear": exam.questions_to_appear,
        "exam_wait_days": exam.exam_wait_days,
        "secure_mode": bool(exam.secure_mode),
        "max_integrity_violations": exam.max_integrity_violations,
        "questions": [_serialize_question(question) for question in exam.questions],
    }


def serialize_content(course: Course) -> dict[str, Any]:
    """Snapshot of the live (non-deleted) curriculum and final exam."""
    return {
        "version": SNAPSHOT_VERSION,
        "chapters": [_serialize_chapter(chapter) for chapter in course.chapters],
        "final_exam": _serialize_exam(course.final_exam),
    }


def content_fingerprint(snapshot: dict[str, Any] | None) -> str:
    payload = json.dumps(snapshot or {}, sort_keys=True, default=str, separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def has_unpublished_content_changes(course: Course) -> bool:
    """True when lessons are live and the editor differs from what students see."""
    if course.status != "published" or not course.content_published:
        return False
    if not course.published_content:
        return False
    return content_fingerprint(serialize_content(course)) != content_fingerprint(course.published_content)


# --- Read view ----------------------------------------------------------------


class ChoiceView:
    def __init__(self, data: dict[str, Any], question: "QuestionView") -> None:
        self.id: int = int(data["id"])
        self.text: str = data.get("text") or ""
        self.is_correct: bool = bool(data.get("is_correct"))
        self.sort_order: int = int(data.get("sort_order") or 0)
        self.question = question


class QuestionView:
    def __init__(self, data: dict[str, Any]) -> None:
        self.id: int = int(data["id"])
        self.prompt: str = data.get("prompt") or ""
        self.sort_order: int = int(data.get("sort_order") or 0)
        self.choices: list[ChoiceView] = [ChoiceView(item, self) for item in data.get("choices") or []]


class QuizView:
    def __init__(self, data: dict[str, Any]) -> None:
        self.id: int = int(data["id"])
        self.title: str = data.get("title") or "Quiz"
        self.questions: list[QuestionView] = [QuestionView(item) for item in data.get("questions") or []]


class BlockView:
    def __init__(
        self,
        data: dict[str, Any],
        *,
        lesson: "LessonView | None",
        chapter: "ChapterView",
    ) -> None:
        self.id: int = int(data["id"])
        self.block_type: str = data.get("block_type") or "text"
        self.title: str | None = data.get("title")
        self.body: str | None = data.get("body")
        self.url: str | None = data.get("url")
        self.label: str | None = data.get("label")
        self.parent_id: int | None = data.get("parent_id")
        self.sort_order: int = int(data.get("sort_order") or 0)
        self.points_possible: int | None = data.get("points_possible")
        self.due_at: datetime | None = _parse_dt(data.get("due_at"))
        self.quiz_id: int | None = data.get("quiz_id")
        quiz = data.get("quiz")
        self.quiz: QuizView | None = QuizView(quiz) if quiz else None
        self.lesson = lesson
        self.lesson_id: int | None = lesson.id if lesson is not None else None
        self.chapter = chapter
        self.chapter_id: int = chapter.id


class LessonView:
    def __init__(self, data: dict[str, Any], chapter: "ChapterView") -> None:
        self.id: int = int(data["id"])
        self.title: str = data.get("title") or ""
        self.body: str | None = data.get("body")
        self.sort_order: int = int(data.get("sort_order") or 0)
        self.chapter = chapter
        self.chapter_id: int = chapter.id
        self.blocks: list[BlockView] = [
            BlockView(item, lesson=self, chapter=chapter) for item in data.get("blocks") or []
        ]


class ChapterView:
    def __init__(self, data: dict[str, Any], course: "PublishedCourse") -> None:
        self.id: int = int(data["id"])
        self.title: str = data.get("title") or ""
        self.sort_order: int = int(data.get("sort_order") or 0)
        self.course = course
        self.course_id: int = course.id
        self.lessons: list[LessonView] = [LessonView(item, self) for item in data.get("lessons") or []]
        self.blocks: list[BlockView] = [
            BlockView(item, lesson=None, chapter=self) for item in data.get("blocks") or []
        ]


class ExamView:
    def __init__(self, data: dict[str, Any], course: "PublishedCourse") -> None:
        self.id: int = int(data["id"])
        self.title: str = data.get("title") or "Final Exam"
        self.pass_percent: int = int(data.get("pass_percent") or 0)
        self.time_limit_minutes: int | None = data.get("time_limit_minutes")
        self.questions_to_appear: int | None = data.get("questions_to_appear")
        self.exam_wait_days: int = int(data.get("exam_wait_days") or 0)
        self.secure_mode: bool = bool(data.get("secure_mode"))
        self.max_integrity_violations: int = int(data.get("max_integrity_violations") or 3)
        self.questions: list[QuestionView] = [QuestionView(item) for item in data.get("questions") or []]
        self.course = course
        self.course_id: int = course.id


class PublishedCourse:
    """Student-facing course: scalar fields from the row, curriculum from the snapshot."""

    def __init__(self, row: Course, snapshot: dict[str, Any]) -> None:
        self._row = row
        self.id: int = row.id
        self.chapters: list[ChapterView] = [
            ChapterView(item, self) for item in snapshot.get("chapters") or []
        ]
        exam = snapshot.get("final_exam")
        self.final_exam: ExamView | None = ExamView(exam, self) if exam else None

        self._lessons: dict[int, LessonView] = {}
        self._blocks: dict[int, BlockView] = {}
        self._quizzes: dict[int, QuizView] = {}
        for chapter in self.chapters:
            for lesson in chapter.lessons:
                self._lessons[lesson.id] = lesson
                for block in lesson.blocks:
                    self._blocks[block.id] = block
            for block in chapter.blocks:
                self._blocks[block.id] = block
                if block.quiz is not None:
                    self._quizzes[block.quiz.id] = block.quiz

    @classmethod
    def from_course(cls, row: Course) -> "PublishedCourse":
        snapshot = row.published_content if row.published_content else serialize_content(row)
        return cls(row, snapshot)

    def __getattr__(self, name: str) -> Any:
        # Scalar course columns and non-content relationships (certificate template).
        return getattr(self._row, name)

    @property
    def row(self) -> Course:
        return self._row

    def chapter(self, chapter_id: int) -> ChapterView | None:
        return next((item for item in self.chapters if item.id == chapter_id), None)

    def lesson(self, lesson_id: int) -> LessonView | None:
        return self._lessons.get(lesson_id)

    def block(self, block_id: int) -> BlockView | None:
        return self._blocks.get(block_id)

    def quiz(self, quiz_id: int) -> QuizView | None:
        return self._quizzes.get(quiz_id)

    def iter_lessons(self) -> Iterator[LessonView]:
        for chapter in self.chapters:
            yield from chapter.lessons

    def lesson_ids(self) -> list[int]:
        return [lesson.id for lesson in self.iter_lessons()]

    def quiz_ids(self) -> list[int]:
        return [
            block.quiz.id
            for chapter in self.chapters
            for block in chapter.blocks
            if block.block_type == "quiz" and block.quiz is not None
        ]

    def assignment_blocks(self) -> list[BlockView]:
        return [
            block
            for chapter in self.chapters
            for block in chapter.blocks
            if block.block_type == "assignment"
        ]

    def assignment_ids(self) -> list[int]:
        return [block.id for block in self.assignment_blocks()]

    def progress_units(self) -> tuple[list[int], list[int], list[int]]:
        return self.lesson_ids(), self.quiz_ids(), self.assignment_ids()


def published_view(course: Course | PublishedCourse) -> PublishedCourse:
    if isinstance(course, PublishedCourse):
        return course
    return PublishedCourse.from_course(course)


# --- Publishing ---------------------------------------------------------------


def purge_deleted_content(db: Session, course: Course) -> None:
    """Hard-delete soft-deleted chapters, lessons and blocks for this course."""
    chapter_ids = [row[0] for row in db.query(Chapter.id).filter(Chapter.course_id == course.id).all()]
    if not chapter_ids:
        return
    doomed_chapters = (
        db.query(Chapter)
        .filter(Chapter.course_id == course.id, Chapter.deleted_at.isnot(None))
        .all()
    )
    doomed_chapter_ids = {chapter.id for chapter in doomed_chapters}
    doomed_lessons = (
        db.query(Lesson)
        .filter(
            Lesson.chapter_id.in_(chapter_ids),
            or_(Lesson.deleted_at.isnot(None), Lesson.chapter_id.in_(doomed_chapter_ids or [-1])),
        )
        .all()
    )
    doomed_lesson_ids = {lesson.id for lesson in doomed_lessons}
    lesson_ids = [row[0] for row in db.query(Lesson.id).filter(Lesson.chapter_id.in_(chapter_ids)).all()]
    doomed_blocks = (
        db.query(ContentBlock)
        .filter(
            or_(
                ContentBlock.chapter_id.in_(chapter_ids),
                ContentBlock.lesson_id.in_(lesson_ids or [-1]),
            ),
            or_(
                ContentBlock.deleted_at.isnot(None),
                ContentBlock.chapter_id.in_(doomed_chapter_ids or [-1]),
                ContentBlock.lesson_id.in_(doomed_lesson_ids or [-1]),
            ),
        )
        .all()
    )
    quiz_ids = {block.quiz_id for block in doomed_blocks if block.quiz_id}
    # Children first so parent deletes never race the ORM cascade.
    for block in sorted(doomed_blocks, key=lambda item: (item.parent_id is None, -item.id)):
        db.delete(block)
    for quiz in db.query(Quiz).filter(Quiz.id.in_(quiz_ids or [-1])).all():
        db.delete(quiz)
    for lesson in doomed_lessons:
        db.delete(lesson)
    for chapter in doomed_chapters:
        db.delete(chapter)
    db.flush()
    db.expire(course)


def publish_content(db: Session, course: Course) -> dict[str, Any]:
    """Make the live curriculum the version students see."""
    purge_deleted_content(db, course)
    snapshot = serialize_content(course)
    course.published_content = snapshot
    course.content_published = True
    course.content_published_at = datetime.now(timezone.utc)
    db.flush()
    return snapshot


def backfill_published_content(db: Session) -> int:
    """Give already-live courses a snapshot so later edits stay hidden until published."""
    rows = (
        db.query(Course)
        .filter(
            Course.status == "published",
            Course.content_published.is_(True),
            Course.published_content.is_(None),
        )
        .all()
    )
    for course in rows:
        course.published_content = serialize_content(course)
        if course.content_published_at is None:
            course.content_published_at = datetime.now(timezone.utc)
    if rows:
        db.commit()
    return len(rows)
