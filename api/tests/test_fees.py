"""Course prices, exam and retake fees, outstanding balances, and scholarship codes."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models import (
    Chapter,
    Course,
    Enrollment,
    FinalExam,
    Order,
    Promotion,
    QuizChoice,
    QuizQuestion,
    User,
)
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


def _login(client: TestClient, email: str) -> dict[str, str]:
    response = client.post("/api/auth/login", json={"email": email, "password": STRONG_PASSWORD})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


def _course(
    db: Session,
    *,
    code: str,
    price_cents: int = 0,
    exam_fee_cents: int = 0,
    retake_fee_cents: int = 0,
    with_exam: bool = False,
) -> Course:
    course = Course(
        code=code,
        title=f"{code} Course",
        description="A published program.",
        slug=code.lower(),
        status="published",
        pass_percent=70,
        price_cents=price_cents,
        exam_fee_cents=exam_fee_cents,
        retake_fee_cents=retake_fee_cents,
        currency="usd",
        draft_meta={"price_cents": price_cents, "title": f"{code} Course"},
    )
    db.add(course)
    db.flush()
    if with_exam:
        db.add(Chapter(course_id=course.id, title="Chapter", sort_order=0))
        exam = FinalExam(
            course_id=course.id,
            title="Final",
            pass_percent=70,
            secure_mode=False,
        )
        db.add(exam)
        db.flush()
        for index in range(2):
            question = QuizQuestion(final_exam_id=exam.id, prompt=f"Question {index + 1}?", sort_order=index)
            db.add(question)
            db.flush()
            db.add(QuizChoice(question_id=question.id, text="Right", is_correct=True, sort_order=0))
            db.add(QuizChoice(question_id=question.id, text="Wrong", is_correct=False, sort_order=1))
    db.commit()
    db.refresh(course)
    return course


def _enroll(db: Session, user: User, course: Course) -> None:
    db.add(Enrollment(user_id=user.id, course_id=course.id, status="enrolled", progress=100))
    db.commit()


def _fail_attempt(client: TestClient, db: Session, course: Course, headers: dict[str, str]) -> None:
    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert started.status_code == 200, started.text
    answers: dict[str, int] = {}
    for question in started.json()["questions"]:
        wrong = (
            db.query(QuizChoice)
            .filter(QuizChoice.question_id == question["id"], QuizChoice.is_correct.is_(False))
            .one()
        )
        answers[str(question["id"])] = wrong.id
    submitted = client.post(
        f"/api/me/courses/{course.id}/final-exam/submit",
        headers=headers,
        json={"answers": answers},
    )
    assert submitted.status_code == 200, submitted.text
    assert submitted.json()["passed"] is False


def test_course_price_change_is_what_checkout_charges(client: TestClient, db: Session) -> None:
    admin = _user(db, email="fees-admin@example.com", role="admin", name="Fees Admin")
    student = _user(db, email="fees-buyer@example.com")
    course = _course(db, code="FEE-PRICE", price_cents=10000)
    admin_headers = _login(client, admin.email)

    updated = client.patch(
        f"/api/admin/fees/courses/{course.id}",
        headers=admin_headers,
        json={"price_cents": 2500},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["price_cents"] == 2500
    db.refresh(course)
    assert course.price_cents == 2500
    assert course.draft_meta["price_cents"] == 2500

    bought = client.post(
        "/api/me/checkout",
        headers=_login(client, student.email),
        json={"course_id": course.id},
    )
    assert bought.status_code == 200, bought.text
    assert bought.json()["total_cents"] == 2500
    assert bought.json()["status"] == "paid"


def test_zero_exam_fee_still_starts(client: TestClient, db: Session) -> None:
    student = _user(db, email="fees-free@example.com")
    course = _course(db, code="FEE-FREE", with_exam=True)
    _enroll(db, student, course)

    started = client.post(
        f"/api/me/courses/{course.id}/final-exam/start",
        headers=_login(client, student.email),
    )
    assert started.status_code == 200, started.text
    assert started.json()["in_progress"] is True


def test_exam_fee_blocks_until_paid_and_lists_as_outstanding(client: TestClient, db: Session) -> None:
    admin = _user(db, email="fees-exam-admin@example.com", role="admin", name="Exam Admin")
    student = _user(db, email="fees-exam@example.com", name="Exam Student")
    course = _course(db, code="FEE-EXAM", with_exam=True, exam_fee_cents=4000)
    _enroll(db, student, course)
    headers = _login(client, student.email)

    blocked = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert blocked.status_code == 402, blocked.text
    detail = blocked.json()["detail"]
    assert detail["kind"] == "exam"
    assert detail["amount_cents"] == 4000
    assert "exam fee" in detail["message"]

    again = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert again.status_code == 402
    assert again.json()["detail"]["order_id"] == detail["order_id"]

    outstanding = client.get("/api/admin/fees", headers=_login(client, admin.email))
    assert outstanding.status_code == 200, outstanding.text
    rows = outstanding.json()["outstanding"]
    assert len(rows) == 1
    assert rows[0]["order_id"] == detail["order_id"]
    assert rows[0]["item_kind"] == "exam"
    assert rows[0]["amount_due_cents"] == 4000
    assert rows[0]["student_email"] == student.email

    before = db.query(Enrollment).filter(Enrollment.user_id == student.id).count()
    paid = client.post("/api/me/checkout", headers=headers, json={"order_id": detail["order_id"]})
    assert paid.status_code == 200, paid.text
    assert paid.json()["status"] == "paid"
    assert db.query(Enrollment).filter(Enrollment.user_id == student.id).count() == before

    cleared = client.get("/api/admin/fees", headers=_login(client, admin.email))
    assert cleared.json()["outstanding"] == []

    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert started.status_code == 200, started.text
    order = db.query(Order).filter(Order.id == detail["order_id"]).one()
    assert order.status == "paid"
    assert all(item.item_kind == "exam" for item in order.items)


def test_retake_fee_blocks_the_next_attempt_until_paid(client: TestClient, db: Session) -> None:
    student = _user(db, email="fees-retake@example.com")
    course = _course(db, code="FEE-RETAKE", with_exam=True, retake_fee_cents=3000)
    _enroll(db, student, course)
    headers = _login(client, student.email)

    _fail_attempt(client, db, course, headers)
    before = db.query(Enrollment).filter(Enrollment.user_id == student.id).count()

    blocked = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert blocked.status_code == 402, blocked.text
    detail = blocked.json()["detail"]
    assert detail["kind"] == "retake"
    assert detail["amount_cents"] == 3000

    paid = client.post("/api/me/checkout", headers=headers, json={"order_id": detail["order_id"]})
    assert paid.status_code == 200, paid.text
    assert db.query(Enrollment).filter(Enrollment.user_id == student.id).count() == before

    started = client.post(f"/api/me/courses/{course.id}/final-exam/start", headers=headers)
    assert started.status_code == 200, started.text


def test_scholarship_code_reduces_the_course_total(client: TestClient, db: Session) -> None:
    admin = _user(db, email="fees-scholar-admin@example.com", role="admin", name="Scholar Admin")
    student = _user(db, email="fees-scholar@example.com")
    course = _course(db, code="FEE-SCHOLAR", price_cents=10000)
    created = client.post(
        "/api/admin/promotions",
        headers=_login(client, admin.email),
        json={
            "code": "half-off",
            "description": "Half scholarship",
            "kind": "scholarship",
            "percent_off": 50,
            "complimentary": False,
            "active": True,
        },
    )
    assert created.status_code == 201, created.text
    assert created.json()["kind"] == "scholarship"

    bought = client.post(
        "/api/me/checkout",
        headers=_login(client, student.email),
        json={"course_id": course.id, "promo_code": "half-off"},
    )
    assert bought.status_code == 200, bought.text
    assert bought.json()["total_cents"] == 5000
    assert bought.json()["status"] == "paid"
    promo = db.query(Promotion).filter(Promotion.code == "HALF-OFF").one()
    assert promo.redemption_count == 1
