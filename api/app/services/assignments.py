"""Shared assignment grading rules for the student hub and admin review."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy.orm import Session, joinedload, selectinload

from app.models import AssignmentAttempt, AssignmentSubmission, BlockCompletion, Chapter, ContentBlock, Course


def as_utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc)


def due_has_passed(due_at: datetime | None, *, now: datetime | None = None) -> bool:
    if due_at is None:
        return False
    moment = now or datetime.now(timezone.utc)
    return as_utc(due_at) < as_utc(moment)


def submission_is_late(due_at: datetime | None, submitted_at: datetime | None) -> bool:
    if due_at is None or submitted_at is None:
        return False
    return as_utc(submitted_at) > as_utc(due_at)


def latest_submitted_at(submission: AssignmentSubmission) -> datetime | None:
    attempts = list(submission.attempts or [])
    if not attempts:
        return submission.created_at
    latest = max(attempts, key=lambda row: (as_utc(row.submitted_at), row.id))
    return latest.submitted_at


def status_bucket(status: str | None) -> str:
    if status == "under_review":
        return "submitted"
    if status in ("passed", "failed"):
        return "evaluated"
    return "pending"


def can_submit_new(due_at: datetime | None) -> bool:
    return not due_has_passed(due_at)


def can_resubmit(status: str | None, due_at: datetime | None) -> bool:
    if status not in ("under_review", "failed"):
        return False
    return not due_has_passed(due_at)


def can_withdraw(status: str | None) -> bool:
    return status == "under_review"


def grade_is_visible(status: str | None) -> bool:
    return status in ("passed", "failed")


def append_attempt(
    db: Session,
    submission: AssignmentSubmission,
    *,
    body: str | None,
    file_url: str | None,
    file_name: str | None,
    submitted_at: datetime | None = None,
) -> AssignmentAttempt:
    attempt = AssignmentAttempt(
        submission_id=submission.id,
        body=body,
        file_url=file_url,
        file_name=file_name,
        submitted_at=submitted_at or datetime.now(timezone.utc),
    )
    db.add(attempt)
    return attempt


def clear_grade(submission: AssignmentSubmission) -> None:
    submission.score = None
    submission.feedback = None
    submission.graded_at = None
    submission.graded_by_id = None
    submission.status = "under_review"
    submission.updated_at = datetime.now(timezone.utc)


def promote_legacy_completions(db: Session, user_id: int, assignment_ids: list[int]) -> None:
    """Turn older completion-only rows into submissions so review and progress stay linked."""
    if not assignment_ids:
        return
    existing = {
        row[0]
        for row in db.query(AssignmentSubmission.content_block_id)
        .filter(
            AssignmentSubmission.user_id == user_id,
            AssignmentSubmission.content_block_id.in_(assignment_ids),
        )
        .all()
    }
    legacy_rows = (
        db.query(BlockCompletion)
        .filter(
            BlockCompletion.user_id == user_id,
            BlockCompletion.content_block_id.in_(assignment_ids),
        )
        .all()
    )
    created: list[AssignmentSubmission] = []
    now = datetime.now(timezone.utc)
    for row in legacy_rows:
        if row.content_block_id in existing:
            continue
        submitted_at = row.completed_at or now
        submission = AssignmentSubmission(
            user_id=user_id,
            content_block_id=row.content_block_id,
            body="Submitted earlier.",
            status="under_review",
            created_at=submitted_at,
            updated_at=submitted_at,
        )
        db.add(submission)
        created.append(submission)
        existing.add(row.content_block_id)
    if not created:
        return
    db.flush()
    for submission in created:
        append_attempt(
            db,
            submission,
            body=submission.body,
            file_url=None,
            file_name=None,
            submitted_at=submission.created_at,
        )
    db.flush()


def submission_map(
    db: Session, user_id: int, assignment_ids: list[int]
) -> dict[int, AssignmentSubmission]:
    promote_legacy_completions(db, user_id, assignment_ids)
    if not assignment_ids:
        return {}
    rows = (
        db.query(AssignmentSubmission)
        .options(selectinload(AssignmentSubmission.attempts))
        .filter(
            AssignmentSubmission.user_id == user_id,
            AssignmentSubmission.content_block_id.in_(assignment_ids),
        )
        .all()
    )
    return {row.content_block_id: row for row in rows}


def assignment_blocks_for_courses(db: Session, course_ids: list[int]) -> list[ContentBlock]:
    if not course_ids:
        return []
    return (
        db.query(ContentBlock)
        .join(Chapter, Chapter.id == ContentBlock.chapter_id)
        .join(Course, Course.id == Chapter.course_id)
        .options(joinedload(ContentBlock.chapter).joinedload(Chapter.course))
        .filter(
            ContentBlock.block_type == "assignment",
            Chapter.course_id.in_(course_ids),
            Course.status == "published",
        )
        .all()
    )
