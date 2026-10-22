"""Direct assignments: admin assign handouts, student visibility, submit, review."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Course, Enrollment, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, email: str, *, role: str = "student", name: str = "Learner") -> User:
    user = User(
        full_name=name,
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


def _course(db: Session, code: str = "DA-1") -> Course:
    course = Course(
        code=code,
        title=f"Course {code}",
        description="Desc",
        slug=code.lower(),
        status="published",
        pass_percent=70,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def _enroll(db: Session, user: User, course: Course) -> None:
    db.add(Enrollment(user_id=user.id, course_id=course.id, status="enrolled", progress=0))
    db.commit()


def test_admin_create_direct_assignment_for_one_and_many_enrolled_students(
    client: TestClient, db: Session
) -> None:
    admin = _user(db, "da-admin@example.com", role="admin", name="Admin")
    student_a = _user(db, "da-a@example.com", name="Alice")
    student_b = _user(db, "da-b@example.com", name="Bob")
    outsider = _user(db, "da-out@example.com", name="Outsider")
    course = _course(db, "DA-MULTI")
    _enroll(db, student_a, course)
    _enroll(db, student_b, course)

    admin_headers = _login(client, admin.email)

    reject = client.post(
        "/api/admin/direct-assignments",
        headers=admin_headers,
        json={
            "course_id": course.id,
            "title": "Handout",
            "file_url": "/uploads/courses/assignments/handout.pdf",
            "file_name": "handout.pdf",
            "student_ids": [student_a.id, outsider.id],
        },
    )
    assert reject.status_code == 400

    single = client.post(
        "/api/admin/direct-assignments",
        headers=admin_headers,
        json={
            "course_id": course.id,
            "title": "Solo handout",
            "body": "Read and answer.",
            "file_url": "/uploads/courses/assignments/solo.pdf",
            "file_name": "solo.pdf",
            "student_ids": [student_a.id],
            "points_possible": 10,
        },
    )
    assert single.status_code == 201
    solo = single.json()
    assert solo["recipient_count"] == 1
    assert solo["title"] == "Solo handout"

    many = client.post(
        "/api/admin/direct-assignments",
        headers=admin_headers,
        json={
            "course_id": course.id,
            "title": "Group handout",
            "file_url": "/uploads/courses/assignments/group.pdf",
            "file_name": "group.pdf",
            "student_ids": [student_a.id, student_b.id],
        },
    )
    assert many.status_code == 201
    assert many.json()["recipient_count"] == 2

    listed = client.get("/api/admin/direct-assignments", headers=admin_headers)
    assert listed.status_code == 200
    assert len(listed.json()) >= 2


def test_student_sees_only_own_recipients_and_can_submit_for_review(
    client: TestClient, db: Session
) -> None:
    admin = _user(db, "da-admin2@example.com", role="admin", name="Admin")
    student_a = _user(db, "da-vis-a@example.com", name="Alice")
    student_b = _user(db, "da-vis-b@example.com", name="Bob")
    course = _course(db, "DA-VIS")
    _enroll(db, student_a, course)
    _enroll(db, student_b, course)
    admin_headers = _login(client, admin.email)

    created = client.post(
        "/api/admin/direct-assignments",
        headers=admin_headers,
        json={
            "course_id": course.id,
            "title": "Visibility handout",
            "body": "Instructions here",
            "file_url": "/uploads/courses/assignments/vis.pdf",
            "file_name": "vis.pdf",
            "student_ids": [student_a.id],
            "points_possible": 15,
        },
    )
    assert created.status_code == 201
    assignment_id = created.json()["id"]

    a_headers = _login(client, student_a.email)
    b_headers = _login(client, student_b.email)

    a_list = client.get("/api/me/assignments", headers=a_headers)
    assert a_list.status_code == 200
    a_rows = [row for row in a_list.json() if row.get("kind") == "direct"]
    assert len(a_rows) == 1
    assert a_rows[0]["direct_assignment_id"] == assignment_id
    assert a_rows[0]["title"] == "Visibility handout"
    assert a_rows[0]["bucket"] == "pending"
    assert a_rows[0]["unlocked"] is True

    b_list = client.get("/api/me/assignments", headers=b_headers)
    assert b_list.status_code == 200
    assert [row for row in b_list.json() if row.get("kind") == "direct"] == []

    forbidden = client.get(f"/api/me/direct-assignments/{assignment_id}", headers=b_headers)
    assert forbidden.status_code == 403

    detail = client.get(f"/api/me/direct-assignments/{assignment_id}", headers=a_headers)
    assert detail.status_code == 200
    payload = detail.json()
    assert payload["kind"] == "direct"
    assert payload["instructions_url"] == "/uploads/courses/assignments/vis.pdf"
    assert payload["instructions_body"] == "Instructions here"
    assert payload["can_submit"] is True

    course_detail = client.get(f"/api/courses/{course.id}", headers=a_headers)
    assert course_detail.status_code == 200
    directs = course_detail.json().get("direct_assignments") or []
    assert any(row["direct_assignment_id"] == assignment_id for row in directs)

    submitted = client.post(
        f"/api/me/direct-assignments/{assignment_id}/submit",
        headers=a_headers,
        json={"body": "My written answer"},
    )
    assert submitted.status_code == 200
    assert submitted.json()["status"] == "under_review"

    after = client.get(f"/api/me/direct-assignments/{assignment_id}", headers=a_headers)
    assert after.status_code == 200
    assert after.json()["bucket"] == "submitted"
    assert after.json()["body"] == "My written answer"

    inbox = client.get("/api/admin/assignment-submissions?status=under_review", headers=admin_headers)
    assert inbox.status_code == 200
    direct_rows = [row for row in inbox.json() if row.get("source") == "direct"]
    assert len(direct_rows) >= 1
    submission = next(row for row in direct_rows if row["direct_assignment_id"] == assignment_id)
    assert submission["student_email"] == student_a.email

    reviewed = client.post(
        f"/api/admin/direct-assignment-submissions/{submission['id']}/review",
        headers=admin_headers,
        json={"status": "passed", "score": 12, "feedback": "Well done"},
    )
    assert reviewed.status_code == 200
    assert reviewed.json()["status"] == "passed"
    assert reviewed.json()["source"] == "direct"
    assert reviewed.json()["score"] == 12

    graded = client.get(f"/api/me/direct-assignments/{assignment_id}", headers=a_headers)
    assert graded.status_code == 200
    assert graded.json()["bucket"] == "evaluated"
    assert graded.json()["score"] == 12
    assert graded.json()["feedback"] == "Well done"
