"""Orders, cart, Stripe checkout, and enrollment activation."""

from __future__ import annotations

import logging
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
from app.services.membership import (
    activate_membership,
    get_membership_certificate_type,
    get_pending_membership_application,
    is_student_membership,
    mark_pending_membership_applications_active,
    revert_membership_to_student,
)

logger = logging.getLogger(__name__)

MANUAL_UNLOCK_MARKER = "MANUAL_UNLOCK"
STALE_PENDING_HOURS = 24

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
    ]
    return all(value and str(value).strip() for value in required)


def require_complete_profile(user: User) -> None:
    if not profile_is_complete(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your name, phone, country, and city before checkout.",
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
    # Optional strings may be cleared with null or "" from the profile editor.
    clearable = {"address", "organization", "job_title", "given_name", "family_name"}
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
        if key not in data:
            continue
        value = data[key]
        if value is None:
            if key in clearable:
                setattr(user, key, None)
            continue
        setattr(user, key, value.strip() if isinstance(value, str) else value)
        if key in clearable and isinstance(value, str) and not value.strip():
            setattr(user, key, None)
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
    from app.services.access_control import require_course_open

    require_course_open(enrollment)
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
    has_membership_item = any(item.membership_type for item in order.items)
    if not has_membership_item and user.membership_status != "inactive":
        user.membership_status = "active"
        if not user.membership_date:
            user.membership_date = now
    granted_titles: list[str] = []
    for item in order.items:
        if item.membership_type:
            renew = (item.membership_kind or "").strip().lower() == "renewal"
            activate_membership(db, user, item.membership_type, renew=renew)
            mark_pending_membership_applications_active(db, user, item.membership_type)
            continue
        if item.course_id is None:
            continue
        course = item.course or db.query(Course).filter(Course.id == item.course_id).one()
        _ensure_enrollment(db, user, course, "enrolled")
        granted_titles.append(course.title)

    from app.services.notifications import notify_payment_received, notify_users

    item_titles = [item.title for item in order.items if (item.title or "").strip()]
    order_label = ", ".join(item_titles[:3]) if item_titles else order.number
    receipt_path = f"/account/receipts/{order.number}"
    notify_payment_received(
        db,
        user,
        amount_cents=paid,
        order_name=order_label,
        receipt_path=receipt_path,
    )
    if granted_titles:
        admin_ids = [row[0] for row in db.query(User.id).filter(User.role == "admin").all()]
        if admin_ids:
            names = ", ".join(granted_titles[:3])
            notify_users(
                db,
                admin_ids,
                title="Course access granted",
                body=(
                    f"{user.full_name} paid and now has access to {names}. "
                    "Review or restrict this in Access Control."
                ),
                kind="access",
                link="/access-control",
            )
    if (user.email or "").strip():
        try:
            from app.services.receipt_email import send_receipt_email

            send_receipt_email(
                to=user.email,
                full_name=user.full_name,
                order_number=order.number,
                amount_cents=paid,
                currency=order.currency,
            )
        except Exception:
            logger.exception("Receipt email failed for order %s", order.number)


def _cancel_stale_pending_course_checkouts(db: Session, user: User, course_ids: list[int]) -> None:
    """Clear stuck pending_payment enrollments/orders so checkout can be retried.

    With same-request manual fulfill, any leftover pending_payment is orphaned — revoke it.
    Also cancel unpaid pending orders for these courses older than STALE_PENDING_HOURS.
    """
    if not course_ids:
        return
    cutoff = datetime.now(timezone.utc) - timedelta(hours=STALE_PENDING_HOURS)
    pending_enrollments = (
        db.query(Enrollment)
        .filter(
            Enrollment.user_id == user.id,
            Enrollment.course_id.in_(course_ids),
            Enrollment.status == "pending_payment",
        )
        .all()
    )
    for enrollment in pending_enrollments:
        enrollment.status = "revoked"
    pending_orders = (
        db.query(Order)
        .options(joinedload(Order.items), joinedload(Order.payments), joinedload(Order.invoices))
        .filter(Order.user_id == user.id, Order.status == "pending")
        .all()
    )
    for order in pending_orders:
        if not any(item.course_id in course_ids for item in order.items):
            continue
        created = order.created_at
        if created and created.tzinfo is None:
            created = created.replace(tzinfo=timezone.utc)
        # Always cancel when we just revoked matching pending enrollments; also age-gate empty leftovers.
        if created is not None and created > cutoff and not pending_enrollments:
            continue
        order.status = "cancelled"
        for payment in order.payments:
            if payment.status == "pending":
                payment.status = "cancelled"
        for invoice in order.invoices:
            if invoice.status == "open":
                invoice.status = "cancelled"
    db.flush()


def mark_manual_unlock(order: Order, payment: Payment | None) -> None:
    if payment is not None:
        payment.provider = "manual"
    if not order.promo_code:
        order.promo_code = MANUAL_UNLOCK_MARKER


def create_checkout_order(
    db: Session,
    user: User,
    courses: list[Course],
) -> tuple[Order, list[Enrollment], bool]:
    if not courses:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one course.")

    course_ids = [course.id for course in courses]
    _cancel_stale_pending_course_checkouts(db, user, course_ids)

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
                detail=f"Payment already started for {course.title}. Try again shortly, or contact CAISBE support.",
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
    course_ids = [item.course_id for item in order.items if item.course_id is not None]
    if course_ids:
        clear_cart(db, order.user_id, course_ids)
    db.commit()
    return order


def create_membership_checkout_order(
    db: Session,
    user: User,
    membership_type: str,
    *,
    kind: str = "application",
) -> tuple[Order, bool]:
    # Membership applications already capture contact fields; do not require the full course profile.
    if not all(
        value and str(value).strip()
        for value in (user.full_name, user.email, user.phone, user.country, user.city)
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Complete your name, phone, country, and city before membership checkout.",
        )
    normalized = normalize_membership_type(membership_type)
    if not normalized or normalized not in MEMBERSHIP_TYPES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid membership type.")
    if is_student_membership(normalized):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student membership is free and does not require payment.",
        )
    kind_value = (kind or "application").strip().lower()
    if kind_value not in {"application", "renewal"}:
        kind_value = "application"

    pending = get_pending_membership_application(db, user)
    if pending is None or (pending.membership_type or "").strip().lower() != normalized:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Submit a membership application for this type before payment.",
        )
    details = (pending.details or "").lower()
    pending_kind = "renewal" if "renewal" in details.split("\n", 1)[0] else "application"
    if pending_kind != kind_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Membership payment does not match your pending application.",
        )

    cert_type = get_membership_certificate_type(db, normalized)
    if cert_type is None or not cert_type.active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This membership type is not available for purchase.",
        )
    price = max(0, int(cert_type.price_cents or 0))
    currency = (cert_type.currency or "cad").lower()
    label = cert_type.label or normalized.replace("-", " ").title()
    title = f"{label} ({'renewal' if kind_value == 'renewal' else 'membership'})"

    order = Order(
        number=_next_number(db, Order, "ORD"),
        user_id=user.id,
        status="pending",
        subtotal_cents=price,
        discount_cents=0,
        total_cents=price,
        amount_paid_cents=0,
        currency=currency,
        promotion_id=None,
        promo_code=None,
    )
    db.add(order)
    db.flush()
    db.add(
        OrderItem(
            order_id=order.id,
            course_id=None,
            membership_type=normalized,
            membership_kind=kind_value,
            title=title,
            unit_price_cents=price,
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
        amount_cents=price,
        amount_paid_cents=0,
        balance_cents=price,
        status="open",
    )
    db.add(invoice)
    db.flush()
    payment = Payment(
        order_id=order.id,
        invoice_id=invoice.id,
        user_id=user.id,
        provider="stripe" if price > 0 else "complimentary",
        amount_cents=price,
        status="pending",
    )
    db.add(payment)
    db.flush()
    if price == 0:
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
        return order, True
    db.flush()
    db.refresh(order)
    return order, False


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
    membership_refunded = False
    for item in order.items:
        if item.membership_type:
            membership_refunded = True
            continue
        if item.course_id is None:
            continue
        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == user.id, Enrollment.course_id == item.course_id)
            .first()
        )
        if enrollment and enrollment.status != "completed":
            enrollment.status = "revoked"
    if membership_refunded:
        revert_membership_to_student(db, user)
