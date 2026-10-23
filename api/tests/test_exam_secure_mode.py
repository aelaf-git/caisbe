"""Secure exam mode: precheck gate, integrity isolation, violation lockout."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Chapter,
    Course,
    Enrollment,
    ExamIntegrityEvent,
    ExamSession,
    FinalExam,
    QuizChoice,
    QuizQuestion,
    User,
)
from app.security.auth import hash_password

STRONG_PASSWORD = "Str0ng-Password!99"


def _student(db: Session, email: str) -> User:
    user = User(
        full_name="Exam Student",
        email=email,
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


def _course_with_exam(db: Session, *, secure: bool = True, max_violations: int = 3) -> tuple[Course, FinalExam]:
    course = Course(
        code="SEC-101",
        title="Secure Exam Course",
        description="Test",
        slug="secure-exam-course",
        status="published",
        pass_percent=70,
    )
    db.add(course)
    db.flush()
    db.add(Chapter(course_id=course.id, title="Ch 1", sort_order=0))
    exam = FinalExam(
        course_id=course.id,
        title="Final",
        pass_percent=70,
        secure_mode=secure,
        max_integrity_violations=max_violations,
        exam_wait_days=0,
    )
    db.add(exam)
    db.flush()
    for i in range(2):
        q = QuizQuestion(final_exam_id=exam.id, prompt=f"Q{i+1}?", sort_order=i)
        db.add(q)
        db.flush()
        db.add(QuizChoice(question_id=q.id, text="A", is_correct=True, sort_order=0))
        db.add(QuizChoice(question_id=q.id, text="B", is_correct=False, sort_order=1))
    db.commit()
    db.refresh(course)
    db.refresh(exam)
    return course, exam


def _enroll(db: Session, user: User, course: Course) -> None:
    db.add(
        Enrollment(
            user_id=user.id,
            course_id=course.id,
            status="enrolled",
            progress=100,
            exam_access="allowed",
        )
    )
    db.commit()


def _login(client: TestClient, email: str) -> str:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return response.json()["access_token"]


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


_ID_PHOTO = "/api/uploads/exams/identity/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.jpg"
_FACE_PHOTO = "/api/uploads/exams/identity/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.jpg"


def _precheck_ok(client: TestClient, course_id: int, token: str) -> None:
    response = client.post(
        f"/api/me/courses/{course_id}/final-exam/precheck",
        headers=_auth(token),
        json={
            "rules_accepted": True,
            "fullscreen_ok": True,
            "visibility_api_ok": True,
            "camera_ok": True,
            "multi_monitor": False,
            "user_agent": "pytest",
            "id_photo_url": _ID_PHOTO,
            "face_photo_url": _FACE_PHOTO,
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["allowed"] is True
    assert response.json().get("identity_status") == "pending"


def _approve_identity(db: Session, user_id: int) -> ExamSession:
    session = db.query(ExamSession).filter(ExamSession.user_id == user_id).one()
    session.identity_status = "approved"
    session.identity_reviewed_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(session)
    return session


def _admin(db: Session, email: str = "admin-identity@example.com") -> User:
    admin = User(
        full_name="Identity Admin",
        email=email,
        phone="+15555550997",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


def test_secure_precheck_requires_identity_photos(client: TestClient, db: Session) -> None:
    user = _student(db, "sec-photos@example.com")
    course, _exam = _course_with_exam(db, secure=True)
    _enroll(db, user, course)
    token = _login(client, user.email)

    missing = client.post(
        f"/api/me/courses/{course.id}/final-exam/precheck",
        headers=_auth(token),
        json={
            "rules_accepted": True,
            "fullscreen_ok": True,
            "visibility_api_ok": True,
            "camera_ok": True,
            "multi_monitor": False,
            "user_agent": "pytest",
        },
    )
    assert missing.status_code == 200, missing.text
    body = missing.json()
    assert body["allowed"] is False
    assert body["secure_ok"] is False
    assert any("photo id" in reason.lower() for reason in body["reasons"])
    assert any("face" in reason.lower() for reason in body["reasons"])

    _precheck_ok(client, course.id, token)
    session = db.query(ExamSession).filter(ExamSession.user_id == user.id).one()
    assert session.id_photo_url == _ID_PHOTO
    assert session.face_photo_url == _FACE_PHOTO
    assert session.secure_ok_at is not None
    assert session.identity_status == "pending"


def test_secure_start_requires_precheck_and_identity_approval(client: TestClient, db: Session) -> None:
    user = _student(db, "sec-a@example.com")
    course, _exam = _course_with_exam(db, secure=True)
    _enroll(db, user, course)
    token = _login(client, user.email)

    blocked = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    assert blocked.status_code == 400
    assert "pre-check" in blocked.json()["detail"].lower()

    _precheck_ok(client, course.id, token)
    pending = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    assert pending.status_code == 400
    assert "pending admin approval" in pending.json()["detail"].lower()

    _approve_identity(db, user.id)
    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    assert started.status_code == 200, started.text
    body = started.json()
    assert body["in_progress"] is True
    assert body["secure_mode"] is True
    assert body["identity_status"] == "approved"
    assert len(body["questions"]) == 2


def test_admin_can_approve_and_reject_exam_identity(client: TestClient, db: Session) -> None:
    admin = _admin(db)
    user = _student(db, "sec-review@example.com")
    course, _exam = _course_with_exam(db, secure=True)
    _enroll(db, user, course)
    token = _login(client, user.email)
    admin_token = _login(client, admin.email)

    _precheck_ok(client, course.id, token)
    listed = client.get(f"/api/admin/students/{user.id}/exam-identity", headers=_auth(admin_token))
    assert listed.status_code == 200, listed.text
    assert len(listed.json()) == 1
    session_id = listed.json()[0]["session_id"]
    assert listed.json()[0]["identity_status"] == "pending"
    assert listed.json()[0]["student_full_name"] == user.full_name

    rejected = client.post(
        f"/api/admin/students/{user.id}/exam-identity/{session_id}/review",
        headers=_auth(admin_token),
        json={"status": "rejected", "note": "Name does not match"},
    )
    assert rejected.status_code == 200, rejected.text
    assert rejected.json()["identity_status"] == "rejected"
    blocked = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    assert blocked.status_code == 400
    assert "rejected" in blocked.json()["detail"].lower()

    _precheck_ok(client, course.id, token)
    listed2 = client.get(f"/api/admin/students/{user.id}/exam-identity", headers=_auth(admin_token))
    session_id = listed2.json()[0]["session_id"]
    approved = client.post(
        f"/api/admin/students/{user.id}/exam-identity/{session_id}/review",
        headers=_auth(admin_token),
        json={"status": "approved"},
    )
    assert approved.status_code == 200, approved.text
    assert approved.json()["identity_status"] == "approved"
    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    assert started.status_code == 200, started.text


def test_integrity_events_isolated_per_student(client: TestClient, db: Session) -> None:
    a = _student(db, "sec-a@example.com")
    b = _student(db, "sec-b@example.com")
    course, exam = _course_with_exam(db, secure=True, max_violations=5)
    _enroll(db, a, course)
    _enroll(db, b, course)
    token_a = _login(client, a.email)
    token_b = _login(client, b.email)

    _precheck_ok(client, course.id, token_a)
    _approve_identity(db, a.id)
    assert client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token_a)).status_code == 200
    assert (
        client.post(
            f"/api/me/courses/{course.id}/final-exam/integrity",
            headers=_auth(token_a),
            json={"events": [{"phase": "live", "event_type": "tab_blur"}]},
        ).status_code
        == 200
    )

    events_a = (
        db.query(ExamIntegrityEvent)
        .filter(ExamIntegrityEvent.user_id == a.id, ExamIntegrityEvent.final_exam_id == exam.id)
        .all()
    )
    events_b = (
        db.query(ExamIntegrityEvent)
        .filter(ExamIntegrityEvent.user_id == b.id, ExamIntegrityEvent.final_exam_id == exam.id)
        .all()
    )
    assert any(e.event_type == "tab_blur" for e in events_a)
    assert events_b == []

    # B not in progress — integrity rejected
    denied = client.post(
        f"/api/me/courses/{course.id}/final-exam/integrity",
        headers=_auth(token_b),
        json={"events": [{"phase": "live", "event_type": "tab_blur"}]},
    )
    assert denied.status_code == 400


def test_violation_lockout_fails_submit(client: TestClient, db: Session) -> None:
    user = _student(db, "sec-lock@example.com")
    course, exam = _course_with_exam(db, secure=True, max_violations=2)
    _enroll(db, user, course)
    token = _login(client, user.email)
    _precheck_ok(client, course.id, token)
    _approve_identity(db, user.id)
    start = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    assert start.status_code == 200
    qid = start.json()["questions"][0]["id"]
    choice_id = start.json()["questions"][0]["choices"][0]["id"]

    first = client.post(
        f"/api/me/courses/{course.id}/final-exam/integrity",
        headers=_auth(token),
        json={"events": [{"phase": "live", "event_type": "fullscreen_exit"}]},
    )
    assert first.status_code == 200
    assert first.json()["locked_out"] is False

    second = client.post(
        f"/api/me/courses/{course.id}/final-exam/integrity",
        headers=_auth(token),
        json={"events": [{"phase": "live", "event_type": "copy_attempt"}]},
    )
    assert second.status_code == 200
    assert second.json()["locked_out"] is True
    assert second.json()["force_submit"] is True

    session = db.query(ExamSession).filter(ExamSession.user_id == user.id).one()
    assert session.violation_count == 2
    assert session.locked_out_at is not None

    submit = client.post(
        f"/api/me/courses/{course.id}/final-exam/submit",
        headers=_auth(token),
        json={"answers": {str(qid): choice_id}},
    )
    assert submit.status_code == 200
    body = submit.json()
    assert body["score"] == 0
    assert body["passed"] is False
    assert body["locked_out"] is True
    assert body["integrity_violations"] == 2
    assert db.query(ExamSession).filter(ExamSession.final_exam_id == exam.id).count() == 0


def test_insecure_exam_skips_precheck(client: TestClient, db: Session) -> None:
    user = _student(db, "sec-open@example.com")
    course, _exam = _course_with_exam(db, secure=False)
    _enroll(db, user, course)
    token = _login(client, user.email)
    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    assert started.status_code == 200
    assert started.json()["in_progress"] is True
    assert started.json()["secure_mode"] is False


def test_admin_can_read_integrity_log(client: TestClient, db: Session) -> None:
    admin = User(
        full_name="Admin",
        email="admin-sec@example.com",
        phone="+15555550999",
        country="Canada",
        city="Toronto",
        hashed_password=hash_password(STRONG_PASSWORD),
        role="admin",
        membership_status="active",
        email_verified_at=datetime.now(timezone.utc),
    )
    db.add(admin)
    db.commit()

    user = _student(db, "sec-log@example.com")
    course, _exam = _course_with_exam(db, secure=True)
    _enroll(db, user, course)
    token = _login(client, user.email)
    _precheck_ok(client, course.id, token)
    _approve_identity(db, user.id)
    client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=_auth(token))
    client.post(
        f"/api/me/courses/{course.id}/final-exam/integrity",
        headers=_auth(token),
        json={"events": [{"phase": "live", "event_type": "paste_attempt"}]},
    )

    admin_token = _login(client, admin.email)
    log = client.get(f"/api/admin/students/{user.id}/exam-integrity", headers=_auth(admin_token))
    assert log.status_code == 200
    types = {row["event_type"] for row in log.json()}
    assert "paste_attempt" in types
    assert "precheck_ok" in types
    assert "identity_pending" in types
