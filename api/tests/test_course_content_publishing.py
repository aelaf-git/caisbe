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


def _pdf_url(name: str) -> str:
    return f"/api/uploads/courses/media/{name}.pdf"


def _write_upload(root, url: str):
    from pathlib import Path

    relative = url.split("/api/uploads/", 1)[1]
    dest = Path(root) / relative
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(b"%PDF-1.4")
    return dest


def test_publish_deletes_files_that_leave_the_snapshot(client: TestClient, db: Session, monkeypatch, tmp_path) -> None:
    from app.config import settings
    from app.services import storage

    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(storage, "object_storage_enabled", lambda: False)

    admin = _user(db, "files-admin@example.com", "admin")
    course, _chapter, first, _second = _published_course(db)
    headers = _login(client, admin.email)
    parent = db.query(ContentBlock).filter(ContentBlock.lesson_id == first.id).one()
    kept = _pdf_url("a" * 32)
    dropped = _pdf_url("b" * 32)
    external = "https://www.youtube.com/watch?v=example"
    drop_id = None
    for url, title in ((kept, "Keep"), (dropped, "Drop"), (external, "Watch")):
        created = client.post(
            f"/api/admin/lessons/{first.id}/blocks",
            headers=headers,
            json={
                "block_type": "pdf" if url != external else "video",
                "title": title,
                "url": url,
                "parent_id": parent.id,
                "sort_order": 1,
            },
        )
        assert created.status_code == 201, created.text
        if url == dropped:
            drop_id = created.json()["id"]
    kept_file = _write_upload(tmp_path, kept)
    dropped_file = _write_upload(tmp_path, dropped)

    published = client.post(f"/api/admin/courses/{course.id}/publish-content", headers=headers)
    assert published.status_code == 200, published.text
    assert kept_file.is_file()
    assert dropped_file.is_file()

    removed = client.delete(f"/api/admin/blocks/{drop_id}", headers=headers)
    assert removed.status_code == 204, removed.text
    assert dropped_file.is_file()

    published_again = client.post(f"/api/admin/courses/{course.id}/publish-content", headers=headers)
    assert published_again.status_code == 200, published_again.text
    assert kept_file.is_file()
    assert not dropped_file.exists()


def test_replaced_unpublished_file_is_deleted_immediately(
    client: TestClient, db: Session, monkeypatch, tmp_path
) -> None:
    from app.config import settings
    from app.services import storage

    monkeypatch.setattr(settings, "upload_dir", str(tmp_path))
    monkeypatch.setattr(storage, "object_storage_enabled", lambda: False)

    admin = _user(db, "replace-admin@example.com", "admin")
    course, _chapter, first, _second = _published_course(db)
    headers = _login(client, admin.email)
    parent = db.query(ContentBlock).filter(ContentBlock.lesson_id == first.id).one()
    live = _pdf_url("c" * 32)
    created = client.post(
        f"/api/admin/lessons/{first.id}/blocks",
        headers=headers,
        json={"block_type": "pdf", "title": "Handout", "url": live, "parent_id": parent.id, "sort_order": 1},
    )
    assert created.status_code == 201, created.text
    block_id = created.json()["id"]
    live_file = _write_upload(tmp_path, live)
    published = client.post(f"/api/admin/courses/{course.id}/publish-content", headers=headers)
    assert published.status_code == 200, published.text

    replacement = _pdf_url("d" * 32)
    replacement_file = _write_upload(tmp_path, replacement)
    updated = client.patch(
        f"/api/admin/blocks/{block_id}",
        headers=headers,
        json={"url": replacement},
    )
    assert updated.status_code == 200, updated.text
    assert live_file.is_file()

    draft = _pdf_url("e" * 32)
    draft_file = _write_upload(tmp_path, draft)
    drafted = client.post(
        f"/api/admin/lessons/{first.id}/blocks",
        headers=headers,
        json={"block_type": "pdf", "title": "Draft", "url": draft, "parent_id": parent.id, "sort_order": 2},
    )
    assert drafted.status_code == 201, drafted.text
    swapped = client.patch(
        f"/api/admin/blocks/{drafted.json()['id']}",
        headers=headers,
        json={"url": _pdf_url("f" * 32)},
    )
    assert swapped.status_code == 200, swapped.text
    assert not draft_file.exists()
    assert replacement_file.is_file()

    published_again = client.post(f"/api/admin/courses/{course.id}/publish-content", headers=headers)
    assert published_again.status_code == 200, published_again.text
    assert not live_file.exists()
    assert replacement_file.is_file()


def _question(prompt: str, correct: str, wrong: str) -> dict:
    return {
        "prompt": prompt,
        "sort_order": 0,
        "choices": [
            {"text": correct, "is_correct": True, "sort_order": 0},
            {"text": wrong, "is_correct": False, "sort_order": 1},
        ],
    }


def test_quiz_autosave_replaces_questions(client: TestClient, db: Session) -> None:
    admin = _user(db, "quiz-admin@example.com", "admin")
    course, chapter, _first, _second = _published_course(db)
    headers = _login(client, admin.email)

    created = client.post(
        f"/api/admin/chapters/{chapter.id}/blocks",
        headers=headers,
        json={
            "block_type": "quiz",
            "title": "Quiz",
            "quiz_title": "Quiz",
            "quiz_questions": [_question("First prompt", "Yes", "No")],
            "sort_order": 0,
        },
    )
    assert created.status_code == 201, created.text
    block_id = created.json()["id"]

    first = client.patch(
        f"/api/admin/blocks/{block_id}",
        headers=headers,
        json={
            "title": "Chapter check",
            "quiz_title": "Chapter check",
            "quiz_questions": [_question("What is a facility?", "A building", "A color")],
        },
    )
    assert first.status_code == 200, first.text
    quiz = first.json()["quiz"]
    assert quiz["title"] == "Chapter check"
    assert quiz["questions"][0]["prompt"] == "What is a facility?"
    assert quiz["questions"][0]["choices"][0]["is_correct"] is True

    second = client.patch(
        f"/api/admin/blocks/{block_id}",
        headers=headers,
        json={
            "title": "Chapter check",
            "quiz_title": "Chapter check",
            "quiz_questions": [
                _question("What is a facility?", "A building", "A color"),
                _question("Who maintains it?", "The team", "Nobody"),
            ],
        },
    )
    assert second.status_code == 200, second.text
    questions = second.json()["quiz"]["questions"]
    assert [item["prompt"] for item in questions] == ["What is a facility?", "Who maintains it?"]
    assert questions[1]["choices"][0]["text"] == "The team"
    assert questions[1]["choices"][0]["is_correct"] is True

    saved = client.get(f"/api/admin/courses/{course.id}", headers=headers)
    assert saved.status_code == 200, saved.text
    stored = next(block for block in saved.json()["chapters"][0]["blocks"] if block["id"] == block_id)
    assert [item["prompt"] for item in stored["quiz"]["questions"]] == [
        "What is a facility?",
        "Who maintains it?",
    ]


def test_assignment_save_updates_instructions_points_and_due_date(client: TestClient, db: Session) -> None:
    admin = _user(db, "assign-admin@example.com", "admin")
    _course, chapter, _first, _second = _published_course(db)
    headers = _login(client, admin.email)

    created = client.post(
        f"/api/admin/chapters/{chapter.id}/blocks",
        headers=headers,
        json={
            "block_type": "assignment",
            "title": "Site visit notes",
            "body": "Describe the site visit.",
            "sort_order": 1,
        },
    )
    assert created.status_code == 201, created.text
    block_id = created.json()["id"]

    updated = client.patch(
        f"/api/admin/blocks/{block_id}",
        headers=headers,
        json={
            "title": "Site visit report",
            "body": "Describe the site visit and the hazards you found.",
            "points_possible": 20,
            "due_at": "2026-12-01T15:00:00Z",
        },
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["title"] == "Site visit report"
    assert "hazards" in updated.json()["body"]
    assert updated.json()["points_possible"] == 20
    assert updated.json()["due_at"] is not None

    cleared = client.patch(
        f"/api/admin/blocks/{block_id}",
        headers=headers,
        json={"points_possible": None, "due_at": None},
    )
    assert cleared.status_code == 200, cleared.text
    assert cleared.json()["points_possible"] is None
    assert cleared.json()["due_at"] is None
    assert "hazards" in cleared.json()["body"]
