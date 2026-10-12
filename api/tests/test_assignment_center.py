"""Student assignment center: inbox, scores, feedback, and resubmit rules."""

from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    AssignmentAttempt,
    AssignmentSubmission,
    Chapter,
    ContentBlock,
    Course,
    Enrollment,
    Lesson,
    LessonProgress,
    Notification,
    User,
)
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, email: str, *, role: str = "student") -> User:
    user = User(
        full_name="Learner" if role == "student" else "Admin",
        email=email,
        phone="+15555550100",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role=role,
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _course_with_assignment(
    db: Session,
    student: User,
    *,
    code: str,
    points: int | None = 20,
    due_at: datetime | None = None,
) -> ContentBlock:
    course = Course(
        code=code,
        title=f"Course {code}",
        description="Desc",
        slug=code.lower(),
        status="published",
        pass_percent=70,
    )
    db.add(course)
    db.flush()
    chapter = Chapter(course_id=course.id, title="Chapter 1", sort_order=0)
    db.add(chapter)
    db.flush()
    block = ContentBlock(
        chapter_id=chapter.id,
        block_type="assignment",
        title=f"Assignment {code}",
        body="Write a short answer.",
        points_possible=points,
        due_at=due_at,
        sort_order=0,
    )
    db.add(block)
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()
    db.refresh(block)
    return block


def test_assignment_list_is_limited_to_the_callers_enrollments(client: TestClient, db: Session) -> None:
    student_a = _user(db, "assign-a@example.com")
    student_b = _user(db, "assign-b@example.com")
    block_a = _course_with_assignment(db, student_a, code="ASG-A")
    block_b = _course_with_assignment(db, student_b, code="ASG-B")

    listed = client.get("/api/me/assignments", headers=_login(client, student_a.email))
    assert listed.status_code == 200
    rows = listed.json()
    assert [row["block_id"] for row in rows] == [block_a.id]
    assert rows[0]["bucket"] == "pending"
    assert rows[0]["course_code"] == "ASG-A"

    other = client.get(f"/api/me/assignments/{block_b.id}", headers=_login(client, student_a.email))
    assert other.status_code == 403


def test_pending_submitted_and_evaluated_with_score_feedback_and_notification(
    client: TestClient, db: Session
) -> None:
    student = _user(db, "assign-grade@example.com")
    admin = _user(db, "assign-admin@example.com", role="admin")
    block = _course_with_assignment(db, student, code="ASG-G", points=20)
    student_headers = _login(client, student.email)

    pending = client.get("/api/me/assignments", headers=student_headers)
    assert pending.status_code == 200
    assert pending.json()[0]["bucket"] == "pending"
    assert pending.json()[0]["score"] is None

    submitted = client.post(
        f"/api/me/blocks/{block.id}/submit",
        headers=student_headers,
        json={"body": "First answer"},
    )
    assert submitted.status_code == 200
    inbox = client.get("/api/me/assignments", headers=student_headers)
    assert inbox.json()[0]["bucket"] == "submitted"
    assert inbox.json()[0]["score"] is None

    submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.content_block_id == block.id).one()
    reviewed = client.post(
        f"/api/admin/assignment-submissions/{submission.id}/review",
        headers=_login(client, admin.email),
        json={"status": "passed", "score": 16, "feedback": "Clear and complete."},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["score"] == 16
    assert reviewed.json()["feedback"] == "Clear and complete."

    detail = client.get(f"/api/me/assignments/{block.id}", headers=student_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["bucket"] == "evaluated"
    assert body["score"] == 16
    assert body["points_possible"] == 20
    assert body["feedback"] == "Clear and complete."
    assert body["can_resubmit"] is False

    course = client.get(f"/api/courses/{block.chapter.course_id}", headers=student_headers)
    assert course.status_code == 200
    assignment = next(
        item for chapter in course.json()["chapters"] for item in chapter["blocks"] if item["id"] == block.id
    )
    assert assignment["submission_score"] == 16
    assert assignment["submission_feedback"] == "Clear and complete."
    assert assignment["submission_body"] == "First answer"

    notes = db.query(Notification).filter(Notification.user_id == student.id).all()
    assert len(notes) == 1
    assert notes[0].kind == "assignment_graded"
    assert notes[0].link == "/assignments"


def test_resubmit_after_fail_keeps_history_and_pass_or_due_date_locks(
    client: TestClient, db: Session
) -> None:
    student = _user(db, "assign-retry@example.com")
    admin = _user(db, "assign-retry-admin@example.com", role="admin")
    block = _course_with_assignment(db, student, code="ASG-R", points=10)
    student_headers = _login(client, student.email)
    admin_headers = _login(client, admin.email)

    first = client.post(
        f"/api/me/blocks/{block.id}/submit",
        headers=student_headers,
        json={"body": "Draft one"},
    )
    assert first.status_code == 200
    submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.content_block_id == block.id).one()
    failed = client.post(
        f"/api/admin/assignment-submissions/{submission.id}/review",
        headers=admin_headers,
        json={"status": "failed", "score": 4, "feedback": "Try again."},
    )
    assert failed.status_code == 200

    retried = client.post(
        f"/api/me/blocks/{block.id}/submit",
        headers=student_headers,
        json={"body": "Draft two"},
    )
    assert retried.status_code == 200
    db.refresh(submission)
    assert submission.status == "under_review"
    assert submission.score is None
    assert submission.feedback is None
    assert submission.body == "Draft two"
    attempts = (
        db.query(AssignmentAttempt)
        .filter(AssignmentAttempt.submission_id == submission.id)
        .order_by(AssignmentAttempt.id)
        .all()
    )
    assert [attempt.body for attempt in attempts] == ["Draft one", "Draft two"]

    passed = client.post(
        f"/api/admin/assignment-submissions/{submission.id}/review",
        headers=admin_headers,
        json={"status": "passed", "score": 9, "feedback": "Much better."},
    )
    assert passed.status_code == 200
    locked = client.post(
        f"/api/me/blocks/{block.id}/submit",
        headers=student_headers,
        json={"body": "Too late"},
    )
    assert locked.status_code == 400

    open_block = _course_with_assignment(db, student, code="ASG-D", points=None, due_at=None)
    opened = client.post(
        f"/api/me/blocks/{open_block.id}/submit",
        headers=student_headers,
        json={"body": "On time"},
    )
    assert opened.status_code == 200
    open_block.due_at = datetime.now(timezone.utc) - timedelta(hours=1)
    db.commit()
    late = client.post(
        f"/api/me/blocks/{open_block.id}/submit",
        headers=student_headers,
        json={"body": "After the deadline"},
    )
    assert late.status_code == 400

    closed = _course_with_assignment(
        db,
        student,
        code="ASG-C",
        due_at=datetime.now(timezone.utc) - timedelta(days=1),
    )
    rejected = client.post(
        f"/api/me/blocks/{closed.id}/submit",
        headers=student_headers,
        json={"body": "Missed it"},
    )
    assert rejected.status_code == 400


def test_withdraw_removes_submission_and_attempts(client: TestClient, db: Session) -> None:
    student = _user(db, "assign-withdraw@example.com")
    block = _course_with_assignment(db, student, code="ASG-W", points=None)
    headers = _login(client, student.email)
    submitted = client.post(
        f"/api/me/blocks/{block.id}/submit",
        headers=headers,
        json={"body": "Take this back"},
    )
    assert submitted.status_code == 200
    submission = db.query(AssignmentSubmission).filter(AssignmentSubmission.content_block_id == block.id).one()
    assert db.query(AssignmentAttempt).filter(AssignmentAttempt.submission_id == submission.id).count() == 1

    withdrawn = client.delete(f"/api/me/blocks/{block.id}/submit", headers=headers)
    assert withdrawn.status_code == 200
    assert db.query(AssignmentSubmission).filter(AssignmentSubmission.content_block_id == block.id).count() == 0
    assert db.query(AssignmentAttempt).filter(AssignmentAttempt.submission_id == submission.id).count() == 0
    listed = client.get("/api/me/assignments", headers=headers)
    assert listed.json()[0]["bucket"] == "pending"
    assert listed.json()[0]["unlocked"] is True


def test_assignment_stays_locked_until_chapter_topics_are_complete(client: TestClient, db: Session) -> None:
    student = _user(db, "assign-lock@example.com")
    course = Course(
        code="ASG-L",
        title="Course ASG-L",
        description="Desc",
        slug="asg-l",
        status="published",
        pass_percent=70,
    )
    db.add(course)
    db.flush()
    earlier = Chapter(course_id=course.id, title="Chapter 1", sort_order=0)
    later = Chapter(course_id=course.id, title="Chapter 2", sort_order=1)
    db.add_all([earlier, later])
    db.flush()
    topic = Lesson(chapter_id=earlier.id, title="Topic 1", sort_order=0)
    db.add(topic)
    block = ContentBlock(
        chapter_id=later.id,
        block_type="assignment",
        title="Assignment ASG-L",
        body="Write a short answer.",
        sort_order=0,
    )
    db.add(block)
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()
    db.refresh(block)
    db.refresh(topic)

    headers = _login(client, student.email)
    listed = client.get("/api/me/assignments", headers=headers)
    assert listed.status_code == 200
    assert listed.json()[0]["unlocked"] is False
    detail = client.get(f"/api/me/assignments/{block.id}", headers=headers)
    assert detail.status_code == 200
    assert detail.json()["unlocked"] is False
    assert detail.json()["can_submit"] is False
    rejected = client.post(
        f"/api/me/blocks/{block.id}/submit",
        headers=headers,
        json={"body": "Too soon"},
    )
    assert rejected.status_code == 400

    db.add(LessonProgress(user_id=student.id, lesson_id=topic.id))
    db.commit()
    opened = client.post(
        f"/api/me/blocks/{block.id}/submit",
        headers=headers,
        json={"body": "Ready"},
    )
    assert opened.status_code == 200
    after = client.get(f"/api/me/assignments/{block.id}", headers=headers)
    assert after.json()["unlocked"] is True
    assert after.json()["bucket"] == "submitted"
