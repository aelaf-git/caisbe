"""Payment still opens a course. Admins can later restrict course, exam, or account."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import Course, Enrollment, LoginEvent, Notification, User
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _user(db: Session, *, email: str, role: str = "student", name: str = "Learner") -> User:
    user = User(
        full_name=name,
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


def _course(db: Session) -> Course:
    course = Course(
        code="ACC-101",
        title="Access Control Course",
        description="A published program.",
        slug="access-control-course",
        status="published",
        pass_percent=70,
        price_cents=2500,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return course


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_payment_enrolls_immediately_and_notifies_admins(client: TestClient, db: Session) -> None:
    admin = _user(db, email="access-admin@example.com", role="admin", name="Access Admin")
    student = _user(db, email="access-student@example.com")
    course = _course(db)
    headers = _auth(_login(client, student.email))

    bought = client.post("/api/me/checkout", headers=headers, json={"course_id": course.id})
    assert bought.status_code == 200, bought.text
    assert bought.json()["status"] == "paid"

    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == student.id, Enrollment.course_id == course.id)
        .one()
    )
    assert enrollment.status == "enrolled"
    assert enrollment.course_access == "allowed"
    assert enrollment.exam_access == "allowed"

    notice = (
        db.query(Notification)
        .filter(Notification.user_id == admin.id, Notification.kind == "access")
        .one()
    )
    assert notice.link == "/access-control"
    assert "Access Control" in notice.body


def test_admin_can_restrict_and_restore_course_access(client: TestClient, db: Session) -> None:
    _user(db, email="course-admin@example.com", role="admin", name="Course Admin")
    student = _user(db, email="course-student@example.com")
    course = _course(db)
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=20))
    db.commit()
    admin_headers = _auth(_login(client, "course-admin@example.com"))
    student_headers = _auth(_login(client, student.email))
    enrollment_id = db.query(Enrollment).filter(Enrollment.user_id == student.id).one().id

    opened = client.get(f"/api/courses/{course.id}", headers=student_headers)
    assert opened.status_code == 200

    restricted = client.patch(
        f"/api/admin/access-control/enrollments/{enrollment_id}",
        headers=admin_headers,
        json={"course_access": "restricted"},
    )
    assert restricted.status_code == 200, restricted.text
    assert restricted.json()["course_access"] == "restricted"

    blocked = client.get(f"/api/courses/{course.id}", headers=student_headers)
    assert blocked.status_code == 403
    assert "restricted access to this course" in blocked.json()["detail"]

    restored = client.patch(
        f"/api/admin/access-control/enrollments/{enrollment_id}",
        headers=admin_headers,
        json={"course_access": "allowed"},
    )
    assert restored.status_code == 200
    opened_again = client.get(f"/api/courses/{course.id}", headers=student_headers)
    assert opened_again.status_code == 200


def test_admin_can_restrict_exam_access(client: TestClient, db: Session) -> None:
    _user(db, email="exam-admin@example.com", role="admin", name="Exam Admin")
    student = _user(db, email="exam-student@example.com")
    course = _course(db)
    db.add(Enrollment(user_id=student.id, course_id=course.id, status="enrolled", progress=100))
    db.commit()
    admin_headers = _auth(_login(client, "exam-admin@example.com"))
    student_headers = _auth(_login(client, student.email))
    enrollment_id = db.query(Enrollment).filter(Enrollment.user_id == student.id).one().id

    restricted = client.patch(
        f"/api/admin/access-control/enrollments/{enrollment_id}",
        headers=admin_headers,
        json={"exam_access": "restricted"},
    )
    assert restricted.status_code == 200, restricted.text

    blocked = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=student_headers)
    assert blocked.status_code == 403
    assert "restricted access to this exam" in blocked.json()["detail"]

    client.patch(
        f"/api/admin/access-control/enrollments/{enrollment_id}",
        headers=admin_headers,
        json={"exam_access": "allowed"},
    )
    released = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=student_headers)
    assert released.status_code != 403
    assert "restricted" not in released.json()["detail"].lower()


def test_suspension_blocks_login_and_existing_session(client: TestClient, db: Session) -> None:
    _user(db, email="suspend-admin@example.com", role="admin", name="Suspend Admin")
    student = _user(db, email="suspend-student@example.com")
    token = _login(client, student.email)
    admin_headers = _auth(_login(client, "suspend-admin@example.com"))

    suspended = client.post(
        f"/api/admin/access-control/users/{student.id}/suspension",
        headers=admin_headers,
        json={"suspended": True},
    )
    assert suspended.status_code == 200, suspended.text
    assert suspended.json()["suspended"] is True

    me = client.get("/api/auth/me", headers=_auth(token))
    assert me.status_code == 403
    assert "suspended" in me.json()["detail"].lower()

    login = client.post(
        "/api/auth/login",
        json={"email": student.email, "password": STRONG_PASSWORD},
    )
    assert login.status_code == 403
    assert "suspended" in login.json()["detail"].lower()

    activated = client.post(
        f"/api/admin/access-control/users/{student.id}/suspension",
        headers=admin_headers,
        json={"suspended": False},
    )
    assert activated.status_code == 200
    assert activated.json()["suspended"] is False
    assert _login(client, student.email)


def test_successful_login_is_stored(client: TestClient, db: Session) -> None:
    _user(db, email="activity-admin@example.com", role="admin", name="Activity Admin")
    student = _user(db, email="activity-student@example.com")
    _login(client, student.email)

    stored = (
        db.query(LoginEvent)
        .filter(LoginEvent.email == student.email, LoginEvent.success.is_(True))
        .one()
    )
    assert stored.reason == "success"
    assert stored.user_id == student.id

    overview = client.get(
        "/api/admin/access-control",
        headers=_auth(_login(client, "activity-admin@example.com")),
    )
    assert overview.status_code == 200, overview.text
    emails = [row["email"] for row in overview.json()["login_events"] if row["success"]]
    assert student.email in emails
