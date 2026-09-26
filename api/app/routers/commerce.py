from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload

from app.config import settings
from app.db import get_db
from app.models import CartItem, Course, Invoice, Order, Payment, SavedCard, User
from app.schemas.commerce import (
    CartItemIn,
    CartItemOut,
    CartOut,
    CheckoutIn,
    CheckoutOut,
    InvoiceOut,
    OrderItemOut,
    OrderOut,
    PromoPreviewIn,
    PromoPreviewOut,
)
from app.schemas.auth import SavedCardCreate, SavedCardOut
from app.security.auth import get_current_user
from app.services.commerce import (
    STRIPE_PROMO_MESSAGE,
    add_to_cart,
    cart_courses_for_user,
    clear_cart,
    create_checkout_order,
    create_stripe_session,
    fulfill_stripe_session,
    load_published_courses,
    quote_courses,
)

router = APIRouter(tags=["commerce"])


def _order_out(order: Order) -> OrderOut:
    if not order.items:
        name = "Course enrollment"
    elif len(order.items) == 1:
        name = order.items[0].title
    else:
        name = f"{len(order.items)} courses"
    return OrderOut(
        id=order.id,
        number=order.number,
        name=name,
        status=order.status,
        created_at=order.created_at,
        total_cents=order.total_cents,
        amount_paid_cents=order.amount_paid_cents,
        balance_cents=max(0, order.total_cents - order.amount_paid_cents),
        currency=order.currency,
        promo_code=order.promo_code,
        items=[
            OrderItemOut(
                course_id=item.course_id,
                title=item.title,
                unit_price_cents=item.unit_price_cents,
                quantity=item.quantity,
            )
            for item in order.items
        ],
    )


def _invoice_out(invoice: Invoice) -> InvoiceOut:
    return InvoiceOut(
        id=invoice.id,
        number=invoice.number,
        bill_date=invoice.bill_date,
        period_start=invoice.period_start,
        period_end=invoice.period_end,
        amount_cents=invoice.amount_cents,
        amount_paid_cents=invoice.amount_paid_cents,
        balance_cents=invoice.balance_cents,
        status=invoice.status,
        order_number=invoice.order.number if invoice.order else None,
    )


def _cart_item_out(row: CartItem) -> CartItemOut:
    course = row.course
    return CartItemOut(
        id=row.id,
        course_id=row.course_id,
        course_code=course.code if course else "",
        course_title=course.title if course else "",
        cover_url=course.cover_url if course else None,
        price_cents=course.price_cents if course else 0,
        currency=(course.currency if course else "usd") or "usd",
        created_at=row.created_at,
    )


def _cart_out(rows: list[CartItem]) -> CartOut:
    items = [_cart_item_out(row) for row in rows if row.course and row.course.status == "published"]
    currency = items[0].currency if items else "usd"
    subtotal = sum(item.price_cents for item in items)
    return CartOut(items=items, subtotal_cents=subtotal, currency=currency, count=len(items))


def _resolve_checkout_courses(db: Session, user: User, payload: CheckoutIn | PromoPreviewIn) -> list[Course]:
    if payload.from_cart:
        courses = cart_courses_for_user(db, user)
        if not courses:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Your cart is empty.")
        return courses
    if payload.course_ids:
        return load_published_courses(db, payload.course_ids)
    if payload.course_id:
        return load_published_courses(db, [payload.course_id])
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one course.")


@router.get("/me/cart", response_model=CartOut)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartOut:
    rows = (
        db.query(CartItem)
        .options(joinedload(CartItem.course))
        .filter(CartItem.user_id == current_user.id)
        .order_by(CartItem.created_at.asc())
        .all()
    )
    return _cart_out(rows)


@router.post("/me/cart", response_model=CartItemOut, status_code=status.HTTP_201_CREATED)
def post_cart_item(
    payload: CartItemIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CartItemOut:
    row = add_to_cart(db, current_user, payload.course_id)
    row = (
        db.query(CartItem)
        .options(joinedload(CartItem.course))
        .filter(CartItem.id == row.id)
        .one()
    )
    return _cart_item_out(row)


@router.delete("/me/cart/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_cart_item(
    course_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(CartItem)
        .filter(CartItem.user_id == current_user.id, CartItem.course_id == course_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cart item not found")
    db.delete(row)
    db.commit()


@router.delete("/me/cart", status_code=status.HTTP_204_NO_CONTENT)
def clear_my_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    clear_cart(db, current_user.id)
    db.commit()


@router.post("/me/checkout/preview", response_model=PromoPreviewOut)
def preview_checkout(
    payload: PromoPreviewIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PromoPreviewOut:
    courses = _resolve_checkout_courses(db, current_user, payload)
    subtotal, discount, total, complimentary, currency = quote_courses(courses)
    message = None if complimentary else STRIPE_PROMO_MESSAGE
    return PromoPreviewOut(
        course_id=courses[0].id if len(courses) == 1 else None,
        course_title=courses[0].title if len(courses) == 1 else f"{len(courses)} courses",
        currency=currency,
        subtotal_cents=subtotal,
        discount_cents=discount,
        total_cents=total,
        complimentary=complimentary,
        promo_code=None,
        message=message,
        items=[
            OrderItemOut(
                course_id=course.id,
                title=course.title,
                unit_price_cents=max(0, course.price_cents or 0),
                quantity=1,
            )
            for course in courses
        ],
    )


@router.post("/me/checkout", response_model=CheckoutOut)
def start_checkout(
    payload: CheckoutIn,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CheckoutOut:
    from_cart = payload.from_cart
    courses = _resolve_checkout_courses(db, current_user, payload)
    order, enrollments, complimentary = create_checkout_order(db, current_user, courses)
    checkout_url = None
    if complimentary:
        clear_cart(db, current_user.id, [course.id for course in courses])
        db.commit()
    else:
        portal = settings.portal_public_url.rstrip("/")
        if from_cart:
            cancel_url = f"{portal}/cart?cancelled=1"
        elif len(courses) == 1:
            cancel_url = f"{portal}/courses/{courses[0].id}/checkout?cancelled=1"
        else:
            cancel_url = f"{portal}/cart?cancelled=1"
        try:
            # Ensure relationships are available for Stripe line items / email
            order = (
                db.query(Order)
                .options(
                    joinedload(Order.items),
                    joinedload(Order.payments),
                    joinedload(Order.user),
                )
                .filter(Order.id == order.id)
                .one()
            )
            session_id, checkout_url = create_stripe_session(order, cancel_url=cancel_url)
            payment = order.payments[0] if order.payments else None
            if payment:
                payment.stripe_session_id = session_id
            db.commit()
        except Exception:
            db.rollback()
            raise
    enrollment_ids = [row.id for row in enrollments]
    if not complimentary:
        # Reload after commit for response fields
        order = db.query(Order).filter(Order.id == order.id).one()
    return CheckoutOut(
        order_id=order.id,
        order_number=order.number,
        enrollment_id=enrollment_ids[0] if enrollment_ids else None,
        enrollment_ids=enrollment_ids,
        total_cents=order.total_cents,
        currency=order.currency,
        complimentary=complimentary,
        checkout_url=checkout_url,
        publishable_key=settings.stripe_publishable_key or None,
        status=order.status,
    )


@router.get("/me/orders", response_model=list[OrderOut])
def list_my_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[OrderOut]:
    rows = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.user_id == current_user.id)
        .order_by(Order.created_at.desc())
        .all()
    )
    return [_order_out(row) for row in rows]


@router.get("/me/invoices", response_model=list[InvoiceOut])
def list_my_invoices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[InvoiceOut]:
    rows = (
        db.query(Invoice)
        .options(joinedload(Invoice.order))
        .filter(Invoice.user_id == current_user.id)
        .order_by(Invoice.bill_date.desc())
        .all()
    )
    return [_invoice_out(row) for row in rows]


@router.get("/me/cards", response_model=list[SavedCardOut])
def list_my_cards(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[SavedCard]:
    return (
        db.query(SavedCard)
        .filter(SavedCard.user_id == current_user.id)
        .order_by(SavedCard.created_at.desc())
        .all()
    )


@router.post("/me/cards", response_model=SavedCardOut, status_code=status.HTTP_201_CREATED)
def save_card(
    payload: SavedCardCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> SavedCard:
    if not payload.last4.isdigit():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter the last four digits only.")
    brand = payload.brand.strip().lower()
    if brand not in {"visa", "mastercard", "amex", "card"}:
        brand = "card"
    card = SavedCard(
        user_id=current_user.id,
        stripe_payment_method_id=payload.stripe_payment_method_id,
        brand=brand,
        last4=payload.last4,
        exp_month=payload.exp_month,
        exp_year=payload.exp_year,
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        is_default=not db.query(SavedCard).filter(SavedCard.user_id == current_user.id).first(),
    )
    db.add(card)
    db.commit()
    db.refresh(card)
    return card


@router.delete("/me/cards/{card_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_card(
    card_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    card = db.query(SavedCard).filter(SavedCard.id == card_id, SavedCard.user_id == current_user.id).first()
    if card is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Card not found")
    db.delete(card)
    db.commit()


@router.post("/me/checkout/confirm", response_model=OrderOut)
def confirm_checkout(
    session_id: str = Query(..., min_length=8),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderOut:
    payment = (
        db.query(Payment)
        .filter(Payment.stripe_session_id == session_id, Payment.user_id == current_user.id)
        .first()
    )
    if payment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if payment.status != "succeeded" and settings.stripe_secret_key:
        import stripe

        stripe.api_key = settings.stripe_secret_key
        session = stripe.checkout.Session.retrieve(session_id)
        if session.payment_status == "paid":
            amount_total = getattr(session, "amount_total", None)
            fulfill_stripe_session(
                db,
                session_id,
                session.payment_intent,
                amount_total=amount_total,
            )
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.id == payment.order_id)
        .one()
    )
    return _order_out(order)


@router.get("/me/orders/{number}", response_model=OrderOut)
def get_my_order(
    number: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> OrderOut:
    order = (
        db.query(Order)
        .options(joinedload(Order.items))
        .filter(Order.number == number, Order.user_id == current_user.id)
        .first()
    )
    if order is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Order not found")
    return _order_out(order)


def _stripe_obj_to_dict(value: object) -> dict:
    """Normalize Stripe SDK objects / dict payloads to plain dicts."""
    if isinstance(value, dict):
        return value
    to_dict = getattr(value, "to_dict", None)
    if callable(to_dict):
        return to_dict()
    raise TypeError(f"Unsupported Stripe payload type: {type(value)!r}")


@router.post("/webhooks/stripe", include_in_schema=False)
async def stripe_webhook(request: Request, db: Session = Depends(get_db)) -> dict[str, str]:
    payload = await request.body()
    sig = request.headers.get("stripe-signature", "")
    if not settings.stripe_webhook_secret or not settings.stripe_secret_key:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Stripe webhook is not configured.")
    import stripe

    stripe.api_key = settings.stripe_secret_key
    try:
        event = _stripe_obj_to_dict(stripe.Webhook.construct_event(payload, sig, settings.stripe_webhook_secret))
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid Stripe signature") from exc

    event_type = event.get("type")
    if event_type in {
        "checkout.session.completed",
        "checkout.session.async_payment_succeeded",
    }:
        session = _stripe_obj_to_dict(event["data"]["object"])
        # Hosted card Checkout is usually paid on completed; async methods pay later.
        payment_status = session.get("payment_status")
        if event_type == "checkout.session.completed" and payment_status not in {"paid", "no_payment_required"}:
            return {"received": "ok"}
        session_id = session.get("id")
        payment_intent = session.get("payment_intent")
        amount_total = session.get("amount_total")
        metadata = _stripe_obj_to_dict(session.get("metadata") or {})
        if session_id:
            payment = db.query(Payment).filter(Payment.stripe_session_id == session_id).first()
            if payment is None:
                order_id = metadata.get("order_id")
                if order_id:
                    payment = db.query(Payment).filter(Payment.order_id == int(order_id)).first()
                    if payment:
                        payment.stripe_session_id = session_id
            if payment:
                fulfill_stripe_session(
                    db,
                    payment.stripe_session_id or session_id,
                    payment_intent,
                    amount_total=amount_total,
                )
    return {"received": "ok"}
