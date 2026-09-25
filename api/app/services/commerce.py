"""Orders, cart, Stripe checkout, and enrollment activation."""

from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.models import (
    CartItem,
    Course,
    Enrollment,
    Invoice,
    Order,
    OrderItem,
    Payment,
    Promotion,
    User,
)
from app.schemas.auth import MEMBERSHIP_TYPES

ACTIVE_ENROLLMENT = {"enrolled", "completed"}
STRIPE_PROMO_MESSAGE = "Have a discount code? Enter it on the Stripe payment page."


def profile_is_complete(user: User) -> bool:
    if user.profile_completed_at:
        return True
    required = [
        user.full_name,
        user.phone,
        user.country,
        user.city,
        user.address,
        user.membership_type,
    ]
    return all(value and str(value).strip() for value in required)


def require_complete_profile(user: User) -> None:
    if not profile_is_complete(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your student profile before checkout.",
        )


def normalize_membership_type(value: str | None) -> str | None:
    if value is None:
        return None
    slug = value.strip().lower().replace(" ", "-").replace("_", "-")
    aliases = {
        "senior/fellow": "senior-fellow",
        "senior-member": "senior-fellow",
        "fellow": "senior-fellow",
        "student-membership": "student",
        "professional-membership": "professional",
        "corporate-membership": "corporate",
        "institutional-member": "institutional",
        "institutional": "institutional",
    }
    slug = aliases.get(slug, slug)
    if slug not in MEMBERSHIP_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Choose a valid membership type.",
        )
    return slug


def apply_profile_fields(user: User, data: dict) -> None:
    if "membership_type" in data and data["membership_type"] is not None:
        data["membership_type"] = normalize_membership_type(data["membership_type"])
    for key in (
        "full_name",
        "given_name",
        "family_name",
        "phone",
        "country",
        "city",
        "address",
        "organization",
        "job_title",
        "membership_type",
    ):
        if key in data and data[key] is not None:
            value = data[key]
            setattr(user, key, value.strip() if isinstance(value, str) else value)
    if not user.membership_date:
        user.membership_date = datetime.now(timezone.utc)
    if profile_is_complete(user) and not user.profile_completed_at:
        user.profile_completed_at = datetime.now(timezone.utc)
        if user.membership_status == "pending":
            user.membership_status = "pending"


def format_money(cents: int, currency: str = "usd") -> str:
    symbol = "$" if currency.lower() == "usd" else f"{currency.upper()} "
    return f"{symbol}{cents / 100:.2f}"


def _next_number(db: Session, model, prefix: str) -> str:
    token = secrets.token_hex(3).upper()
    candidate = f"{prefix}-{token}"
    while db.query(model).filter(model.number == candidate).first():
        token = secrets.token_hex(3).upper()
        candidate = f"{prefix}-{token}"
    return candidate


def lookup_promotion(db: Session, code: str | None, course: Course) -> Promotion | None:
    """Kept for admin tooling; student paid checkout uses Stripe promotion codes."""
    if not code or not code.strip():
        return None
    promo = db.query(Promotion).filter(Promotion.code == code.strip().upper()).first()
    if promo is None or not promo.active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Promotion code is not valid.")
    if promo.expires_at and promo.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This promotion has expired.")
    if promo.course_id and promo.course_id != course.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This code does not apply to this course.")
    if promo.max_redemptions is not None and promo.redemption_count >= promo.max_redemptions:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="This promotion has been fully used.")
    return promo


def quote_course(course: Course, promo: Promotion | None = None) -> tuple[int, int, int, bool]:
    subtotal = max(0, course.price_cents or 0)
    discount = 0
    complimentary = False
    if promo:
        if promo.complimentary or (promo.percent_off or 0) >= 100:
            discount = subtotal
            complimentary = True
        elif promo.percent_off:
            discount = int(round(subtotal * promo.percent_off / 100))
        elif promo.amount_off_cents:
            discount = min(subtotal, promo.amount_off_cents)
    total = max(0, subtotal - discount)
    if total == 0:
        complimentary = True
    return subtotal, discount, total, complimentary


def quote_courses(courses: list[Course]) -> tuple[int, int, int, bool, str]:
    if not courses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one course.")
    currency = (courses[0].currency or "usd").lower()
    for course in courses:
        if (course.currency or "usd").lower() != currency:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="All courses in one checkout must use the same currency.",
            )
    subtotal = sum(max(0, course.price_cents or 0) for course in courses)
    total = subtotal
    complimentary = total == 0
    return subtotal, 0, total, complimentary, currency


def active_enrollment(db: Session, user_id: int, course_id: int) -> Enrollment | None:
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user_id, Enrollment.course_id == course_id)
        .first()
    )
    if enrollment is None:
        return None
    if enrollment.status in ACTIVE_ENROLLMENT:
        return enrollment
    return None


def require_active_enrollment(db: Session, user: User, course_id: int) -> Enrollment:
    enrollment = active_enrollment(db, user.id, course_id)
    if enrollment is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Course access unlocks after payment.",
        )
    return enrollment


def _ensure_enrollment(db: Session, user: User, course: Course, status_value: str) -> Enrollment:
    enrollment = (
        db.query(Enrollment)
        .filter(Enrollment.user_id == user.id, Enrollment.course_id == course.id)
        .first()
    )
    if enrollment is None:
        enrollment = Enrollment(
            user_id=user.id,
            course_id=course.id,
            status=status_value,
            progress=0,
        )
        db.add(enrollment)
        db.flush()
        return enrollment
    if enrollment.status == "revoked" or enrollment.status == "pending_payment":
        enrollment.status = status_value
    return enrollment


def load_published_courses(db: Session, course_ids: list[int]) -> list[Course]:
    if not course_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one course.")
    unique_ids = list(dict.fromkeys(course_ids))
    courses = (
        db.query(Course)
        .filter(Course.id.in_(unique_ids), Course.status == "published")
        .all()
    )
    by_id = {course.id: course for course in courses}
    missing = [course_id for course_id in unique_ids if course_id not in by_id]
    if missing:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="One or more courses were not found.")
    return [by_id[course_id] for course_id in unique_ids]


def cart_courses_for_user(db: Session, user: User) -> list[Course]:
    rows = (
        db.query(CartItem)
        .options(joinedload(CartItem.course))
        .filter(CartItem.user_id == user.id)
        .order_by(CartItem.created_at.asc())
        .all()
    )
    courses: list[Course] = []
    for row in rows:
        course = row.course
        if course is None or course.status != "published":
            continue
        courses.append(course)
    return courses


def clear_cart(db: Session, user_id: int, course_ids: list[int] | None = None) -> None:
    query = db.query(CartItem).filter(CartItem.user_id == user_id)
    if course_ids is not None:
        query = query.filter(CartItem.course_id.in_(course_ids))
    query.delete(synchronize_session=False)


def add_to_cart(db: Session, user: User, course_id: int) -> CartItem:
    course = db.query(Course).filter(Course.id == course_id, Course.status == "published").first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    if active_enrollment(db, user.id, course.id):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already enrolled")
    existing = (
        db.query(CartItem)
        .filter(CartItem.user_id == user.id, CartItem.course_id == course.id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already in cart")
    row = CartItem(user_id=user.id, course_id=course.id)
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


def fulfill_order(db: Session, order: Order, amount_paid_cents: int | None = None) -> None:
    if order.status == "paid":
        return
    now = datetime.now(timezone.utc)
    paid = order.total_cents if amount_paid_cents is None else max(0, amount_paid_cents)
    if amount_paid_cents is not None:
        order.discount_cents = max(0, order.subtotal_cents - paid)
        order.total_cents = paid
    order.status = "paid"
    order.paid_at = now
    order.amount_paid_cents = paid
    for invoice in order.invoices:
        invoice.amount_cents = paid
        invoice.amount_paid_cents = paid
        invoice.balance_cents = 0
        invoice.status = "paid"
    for payment in order.payments:
        if payment.status == "pending":
            payment.status = "succeeded"
            payment.amount_cents = paid
    if order.promotion_id:
        promo = db.query(Promotion).filter(Promotion.id == order.promotion_id).first()
        if promo:
            promo.redemption_count = (promo.redemption_count or 0) + 1
    user = order.user or db.query(User).filter(User.id == order.user_id).one()
    if user.membership_status != "inactive":
        user.membership_status = "active"
        if not user.membership_date:
            user.membership_date = now
    for item in order.items:
        course = item.course or db.query(Course).filter(Course.id == item.course_id).one()
        _ensure_enrollment(db, user, course, "enrolled")


def create_checkout_order(
    db: Session,
    user: User,
    courses: list[Course],
) -> tuple[Order, list[Enrollment], bool]:
    require_complete_profile(user)
    if not courses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one course.")

    for course in courses:
        if active_enrollment(db, user.id, course.id):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Already enrolled in {course.title}",
            )
        pending = (
            db.query(Enrollment)
            .filter(
                Enrollment.user_id == user.id,
                Enrollment.course_id == course.id,
                Enrollment.status == "pending_payment",
            )
            .first()
        )
        if pending:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Payment already started for {course.title}. Open Complete payment for that course, or wait and try again.",
            )

    subtotal, discount, total, complimentary, currency = quote_courses(courses)
    order = Order(
        number=_next_number(db, Order, "ORD"),
        user_id=user.id,
        status="pending",
        subtotal_cents=subtotal,
        discount_cents=discount,
        total_cents=total,
        amount_paid_cents=0,
        currency=currency,
        promotion_id=None,
        promo_code=None,
    )
    db.add(order)
    db.flush()
    for course in courses:
        db.add(
            OrderItem(
                order_id=order.id,
                course_id=course.id,
                title=course.title,
                unit_price_cents=max(0, course.price_cents or 0),
                quantity=1,
            )
        )
    now = datetime.now(timezone.utc)
    invoice = Invoice(
        number=_next_number(db, Invoice, "INV"),
        order_id=order.id,
        user_id=user.id,
        bill_date=now,
        period_start=now,
        period_end=now + timedelta(days=365),
        amount_cents=total,
        amount_paid_cents=0,
        balance_cents=total,
        status="open",
    )
    db.add(invoice)
    db.flush()
    payment = Payment(
        order_id=order.id,
        invoice_id=invoice.id,
        user_id=user.id,
        provider="stripe" if total > 0 else "complimentary",
        amount_cents=total,
        status="pending",
    )
    db.add(payment)
    enrollments = [_ensure_enrollment(db, user, course, "pending_payment") for course in courses]
    db.flush()
    if complimentary or total == 0:
        payment.provider = "complimentary"
        fulfill_order(db, order)
        db.commit()
        order = (
            db.query(Order)
            .options(
                joinedload(Order.items),
                joinedload(Order.invoices),
                joinedload(Order.payments),
                joinedload(Order.user),
            )
            .filter(Order.id == order.id)
            .one()
        )
        enrollment_ids = [row.id for row in enrollments]
        enrollments = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.course))
            .filter(Enrollment.id.in_(enrollment_ids))
            .all()
        )
        return order, enrollments, True

    # Paid path: leave uncommitted so the router can attach a Stripe session or roll back.
    db.flush()
    db.refresh(order)
    return order, enrollments, False


def create_stripe_session(order: Order, *, cancel_url: str) -> tuple[str, str]:
    if not settings.stripe_secret_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Card payment is not configured. Contact CAISBE or set a $0 course price.",
        )
    if not order.items:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Order has no items.")
    import stripe

    stripe.api_key = settings.stripe_secret_key
    portal = settings.portal_public_url.rstrip("/")
    line_items = [
        {
            "quantity": item.quantity or 1,
            "price_data": {
                "currency": order.currency,
                "unit_amount": item.unit_price_cents,
                "product_data": {"name": item.title},
            },
        }
        for item in order.items
    ]
    session = stripe.checkout.Session.create(
        mode="payment",
        success_url=f"{portal}/checkout/success?order={order.number}&session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=cancel_url,
        customer_email=order.user.email if order.user else None,
        client_reference_id=str(order.id),
        metadata={"order_id": str(order.id), "order_number": order.number},
        line_items=line_items,
        allow_promotion_codes=True,
    )
    return session.id, session.url


def fulfill_stripe_session(
    db: Session,
    session_id: str,
    payment_intent: str | None = None,
    amount_total: int | None = None,
) -> Order | None:
    payment = db.query(Payment).filter(Payment.stripe_session_id == session_id).first()
    if payment is None:
        return None
    if payment_intent:
        payment.stripe_payment_intent_id = str(payment_intent)
    order = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.invoices), joinedload(Order.payments))
        .filter(Order.id == payment.order_id)
        .one()
    )
    fulfill_order(db, order, amount_paid_cents=amount_total)
    clear_cart(db, order.user_id, [item.course_id for item in order.items])
    db.commit()
    return order


def refund_payment(db: Session, payment: Payment, admin: User) -> None:
    order = payment.order
    if payment.stripe_payment_intent_id and settings.stripe_secret_key:
        import stripe

        stripe.api_key = settings.stripe_secret_key
        stripe.Refund.create(payment_intent=payment.stripe_payment_intent_id)
    payment.status = "refunded"
    payment.reviewed_at = datetime.now(timezone.utc)
    payment.reviewed_by_id = admin.id
    order.status = "refunded"
    order.amount_paid_cents = 0
    for invoice in order.invoices:
        invoice.amount_paid_cents = 0
        invoice.balance_cents = invoice.amount_cents
        invoice.status = "refunded"
    user = order.user
    for item in order.items:
        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == user.id, Enrollment.course_id == item.course_id)
            .first()
        )
        if enrollment and enrollment.status != "completed":
            enrollment.status = "revoked"
