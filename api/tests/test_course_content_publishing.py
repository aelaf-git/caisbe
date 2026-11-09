"""Course content edits stay hidden from students until the admin publishes them."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Chapter, ContentBlock, Course, Enrollment, FinalExam, Lesson, User
from app.security.auth import hash_password
from app.services.course_content import publish_content

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, email: str, role: str) -> User:
    user = User(
        full_name="Admin" if role == "admin" else "Learner",
        email=email,
        phone="+15555550111",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role=role,
        membership_type="student",
        membership_status="active",
        membership_date=datetime.now(timezone.utc),
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _published_course(db: Session) -> tuple[Course, Chapter, Lesson, Lesson]:
    course = Course(
        code="PUB-1",
        title="Publish Course",
        description="Snapshot test.",
        slug="pub-1",
        status="published",
        content_published=True,
        pass_percent=70,
        price_cents=1000,
    )
    db.add(course)
    db.flush()
    chapter = Chapter(course_id=course.id, title="Chapter 1", sort_order=0)
    db.add(chapter)
    db.flush()
    first = Lesson(chapter_id=chapter.id, title="Topic 1", body="<p>Original</p>", sort_order=0)
    second = Lesson(chapter_id=chapter.id, title="Topic 2", body="<p>Second</p>", sort_order=1)
    db.add_all([first, second])
    db.flush()
    db.add(
        ContentBlock(
            lesson_id=first.id,
            block_type="text",
            title="Intro",
            body="<p>Body</p>",
            sort_order=0,
        )
    )
    db.add(FinalExam(course_id=course.id, title="Final", pass_percent=70, secure_mode=False, exam_wait_days=0))
    db.flush()
    publish_content(db, course)
    db.commit()
    for row in (course, chapter, first, second):
        db.refresh(row)
    return course, chapter, first, second


def _enroll(db: Session, user: User, course: Course) -> None:
    db.add(Enrollment(user_id=user.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()


def test_content_edits_hidden_until_publish(client: TestClient, db: Session) -> None:
    admin = _user(db, "pub-admin@example.com", "admin")
    student = _user(db, "pub-student@example.com", "student")
    course, chapter, first, _second = _published_course(db)
    _enroll(db, student, course)
    admin_headers = _login(client, admin.email)
    student_headers = _login(client, student.email)

    before = client.get(f"/api/admin/courses/{course.id}", headers=admin_headers)
    assert before.status_code == 200, before.text
    assert before.json()["has_unpublished_content_changes"] is False
    assert before.json()["content_published_at"] is not None

    renamed = client.patch(
        f"/api/admin/lessons/{first.id}",
        headers=admin_headers,
        json={"title": "Topic 1 (revised)"},
    )
    assert renamed.status_code == 200, renamed.text
    added = client.post(
        f"/api/admin/courses/{course.id}/chapters",
        headers=admin_headers,
        json={"title": "Chapter 2", "sort_order": 1},
    )
    assert added.status_code == 201, added.text
    new_lesson = client.post(
        f"/api/admin/chapters/{added.json()['id']}/lessons",
        headers=admin_headers,
        json={"title": "Topic 3", "body": "<p>New</p>", "sort_order": 0},
    )
    assert new_lesson.status_code == 201, new_lesson.text
    new_block = client.post(
        f"/api/admin/lessons/{new_lesson.json()['id']}/blocks",
        headers=admin_headers,
        json={"block_type": "text", "title": "Notes", "body": "<p>Text</p>", "sort_order": 0},
    )
    assert new_block.status_code == 201, new_block.text

    pending = client.get(f"/api/admin/courses/{course.id}", headers=admin_headers)
    assert pending.json()["has_unpublished_content_changes"] is True
    listing = client.get("/api/admin/courses", headers=admin_headers)
    assert listing.status_code == 200
    row = next(item for item in listing.json() if item["id"] == course.id)
    assert row["has_unpublished_content_changes"] is True

    student_view = client.get(f"/api/courses/{course.id}", headers=student_headers)
    assert student_view.status_code == 200, student_view.text
    chapters = student_view.json()["chapters"]
    assert [item["title"] for item in chapters] == ["Chapter 1"]
    assert chapters[0]["lessons"][0]["title"] == "Topic 1"

    lesson_view = client.get(f"/api/courses/{course.id}/lessons/{first.id}", headers=student_headers)
    assert lesson_view.status_code == 200
    assert lesson_view.json()["title"] == "Topic 1"

    published = client.post(f"/api/admin/courses/{course.id}/publish-content", headers=admin_headers)
    assert published.status_code == 200, published.text
    assert published.json()["has_unpublished_content_changes"] is False

    after = client.get(f"/api/courses/{course.id}", headers=student_headers)
    chapters = after.json()["chapters"]
    assert [item["title"] for item in chapters] == ["Chapter 1", "Chapter 2"]
    assert chapters[0]["lessons"][0]["title"] == "Topic 1 (revised)"


def test_soft_deleted_lesson_still_works_for_students_until_publish(
    client: TestClient, db: Session
) -> None:
    admin = _user(db, "del-admin@example.com", "admin")
    student = _user(db, "del-student@example.com", "student")
    course, chapter, first, second = _published_course(db)
    _enroll(db, student, course)
    admin_headers = _login(client, admin.email)
    student_headers = _login(client, student.email)

    removed = client.delete(f"/api/admin/lessons/{second.id}", headers=admin_headers)
    assert removed.status_code == 204, removed.text

    editor = client.get(f"/api/admin/courses/{course.id}", headers=admin_headers)
    titles = [lesson["title"] for lesson in editor.json()["chapters"][0]["lessons"]]
    assert titles == ["Topic 1"]
    assert editor.json()["has_unpublished_content_changes"] is True

    # Students still see and can complete the lesson from the published version.
    student_view = client.get(f"/api/courses/{course.id}", headers=student_headers)
    assert [lesson["title"] for lesson in student_view.json()["chapters"][0]["lessons"]] == [
        "Topic 1",
        "Topic 2",
    ]
    done_first = client.post(f"/api/me/lessons/{first.id}/complete", headers=student_headers)
    assert done_first.status_code == 200, done_first.text
    done_second = client.post(f"/api/me/lessons/{second.id}/complete", headers=student_headers)
    assert done_second.status_code == 200, done_second.text
    assert done_second.json()["progress"] == 100

    # The row is still in the database until the admin publishes.
    assert db.query(Lesson).filter(Lesson.id == second.id).first() is not None

    published = client.post(f"/api/admin/courses/{course.id}/publish-content", headers=admin_headers)
    assert published.status_code == 200, published.text
    db.expire_all()
    assert db.query(Lesson).filter(Lesson.id == second.id).first() is None

    gone = client.post(f"/api/me/lessons/{second.id}/complete", headers=student_headers)
    assert gone.status_code == 404
    after = client.get(f"/api/courses/{course.id}", headers=student_headers)
    assert [lesson["title"] for lesson in after.json()["chapters"][0]["lessons"]] == ["Topic 1"]
    assert after.json()["progress"] == 100


def test_publish_content_requires_listed_course(client: TestClient, db: Session) -> None:
    admin = _user(db, "draft-admin@example.com", "admin")
    course = Course(
        code="DRF-1",
        title="Draft Course",
        description="Not listed yet.",
        slug="drf-1",
        status="draft",
        pass_percent=70,
        price_cents=1000,
    )
    db.add(course)
    db.commit()
    headers = _login(client, admin.email)

    blocked = client.post(f"/api/admin/courses/{course.id}/publish-content", headers=headers)
    assert blocked.status_code == 400
    assert "course info" in blocked.json()["detail"].lower()
