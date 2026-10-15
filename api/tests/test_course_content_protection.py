"""Per-course content_protection flag for portal lockdown."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Chapter, ContentBlock, Course, Enrollment, Lesson, LessonProgress, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _admin(db: Session) -> User:
    user = User(
        full_name="Admin",
        email="admin-protect@example.com",
        phone="+15555550999",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _student(db: Session) -> User:
    user = User(
        full_name="Student",
        email="student-protect@example.com",
        phone="+15555550100",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="student",
        membership_type="student",
        membership_status="active",
        membership_date=datetime.now(timezone.utc),
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def test_new_course_defaults_content_protection_on(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    created = client.post(
        "/api/admin/courses",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "PROT-1",
            "title": "Protected Course",
            "description": "Desc",
            "slug": "protected-course",
        },
    )
    assert created.status_code in (200, 201), created.text
    body = created.json()
    assert body["content_protection"] is True
    course = db.query(Course).filter(Course.id == body["id"]).one()
    assert course.content_protection is True


def test_admin_can_toggle_content_protection(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    token = _login(client, admin.email)
    created = client.post(
        "/api/admin/courses",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "code": "PROT-2",
            "title": "Toggle Course",
            "description": "Desc",
            "slug": "toggle-course",
        },
    )
    course_id = created.json()["id"]

    # Publish so meta edits normally go to draft — content_protection must still apply live.
    pub = client.patch(
        f"/api/admin/courses/{course_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"status": "published"},
    )
    # May fail publish validation if empty content — set status via db if needed.
    if pub.status_code != 200:
        course = db.query(Course).filter(Course.id == course_id).one()
        course.status = "published"
        db.commit()

    patched = client.patch(
        f"/api/admin/courses/{course_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"content_protection": False},
    )
    assert patched.status_code == 200, patched.text
    assert patched.json()["content_protection"] is False

    db.expire_all()
    course = db.query(Course).filter(Course.id == course_id).one()
    assert course.content_protection is False


def test_student_course_detail_includes_flag(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    student = _student(db)
    admin_token = _login(client, admin.email)
    created = client.post(
        "/api/admin/courses",
        headers={"Authorization": f"Bearer {admin_token}"},
        json={
            "code": "PROT-3",
            "title": "Student Flag Course",
            "description": "Desc",
            "slug": "student-flag-course",
            "content_protection": True,
        },
    )
    assert created.status_code in (200, 201), created.text
    course_id = created.json()["id"]
    course = db.query(Course).filter(Course.id == course_id).one()
    course.status = "published"
    db.add(Enrollment(user_id=student.id, course_id=course_id, status="enrolled", progress=0))
    db.commit()

    student_token = _login(client, student.email)
    detail = client.get(
        f"/api/courses/{course_id}",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert detail.status_code == 200, detail.text
    assert detail.json()["content_protection"] is True


def test_scraper_user_agents_blocked_and_robots_header_set(client: TestClient, db: Session) -> None:
    blocked = client.get("/api/courses", headers={"User-Agent": "Scrapy/2.11 (+https://scrapy.org)"})
    assert blocked.status_code == 403
    assert "noai" in blocked.headers.get("X-Robots-Tag", "")

    ai_bot = client.get("/api/courses", headers={"User-Agent": "Mozilla/5.0 (compatible; GPTBot/1.0)"})
    assert ai_bot.status_code == 403

    normal = client.get("/api/courses")
    assert normal.status_code == 200
    assert "noindex" in normal.headers.get("X-Robots-Tag", "")


def test_public_courses_truncates_long_description_and_locks_future_lessons(
    client: TestClient, db: Session
) -> None:
    student = _student(db)
    long_desc = "Facility management curriculum overview. " * 20
    course = Course(
        code="SCRP-1",
        title="Anti-Scrape Course",
        description=long_desc,
        slug="anti-scrape-course",
        status="published",
        pass_percent=70,
        price_cents=5000,
    )
    db.add(course)
    db.flush()
    chapter = Chapter(course_id=course.id, title="Chapter 1", sort_order=0)
    db.add(chapter)
    db.flush()
    lesson1 = Lesson(chapter_id=chapter.id, title="Topic 1", body="First topic full lecture notes", sort_order=0)
    lesson2 = Lesson(chapter_id=chapter.id, title="Topic 2", body="Second topic secret lecture notes", sort_order=1)
    db.add_all([lesson1, lesson2])
    db.flush()
    db.add(
        ContentBlock(
            lesson_id=lesson2.id,
            block_type="pdf",
            title="Locked PDF",
            url="/api/uploads/courses/media/secret.pdf",
            sort_order=0,
        )
    )
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()

    # 1. Public catalog returns a truncated teaser, not the full curriculum text
    catalog = client.get("/api/courses").json()
    matched = next(item for item in catalog if item["code"] == "SCRP-1")
    assert len(matched["description"]) <= 265
    assert matched["description"].endswith("…")

    # 2. Enrolled student gets Topic 1 body, but Topic 2 body & block URLs are redacted until Topic 1 is completed
    student_token = _login(client, student.email)
    headers = {"Authorization": f"Bearer {student_token}"}
    detail = client.get(f"/api/courses/{course.id}", headers=headers)
    assert detail.status_code == 200
    lessons = detail.json()["chapters"][0]["lessons"]
    assert lessons[0]["body"] == "First topic full lecture notes"
    assert lessons[1]["body"] == ""
    assert lessons[1]["blocks"][0]["url"] is None

    # Direct fetch of locked Lesson 2 is rejected with 400
    locked_fetch = client.get(f"/api/courses/{course.id}/lessons/{lesson2.id}", headers=headers)
    assert locked_fetch.status_code == 400

    # Complete Topic 1 -> Topic 2 is now unlocked in both endpoints
    db.add(LessonProgress(user_id=student.id, lesson_id=lesson1.id))
    db.commit()
    unlocked_fetch = client.get(f"/api/courses/{course.id}/lessons/{lesson2.id}", headers=headers)
    assert unlocked_fetch.status_code == 200
    assert unlocked_fetch.json()["body"] == "Second topic secret lecture notes"
    assert unlocked_fetch.json()["blocks"][0]["url"] == "/api/uploads/courses/media/secret.pdf"

