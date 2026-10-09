"""Admin course prices, exam fees, and unpaid orders."""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy.orm.attributes import flag_modified

from app.db import get_db
from app.models import Course, Order, Promotion, User
from app.schemas.commerce import CourseFeeOut, CourseFeeUpdate, FeesOverviewOut, OutstandingPaymentOut, PromotionOut
from app.security.auth import require_admin

router = APIRouter(prefix="/admin/fees", tags=["fees"])


def _course_fee(course: Course) -> CourseFeeOut:
    return CourseFeeOut(
        id=course.id,
        code=course.code,
        title=course.title,
        status=course.status,
        currency=course.currency or "usd",
        price_cents=course.price_cents or 0,
        exam_fee_cents=course.exam_fee_cents or 0,
        retake_fee_cents=course.retake_fee_cents or 0,
    )


def _outstanding_kind(order: Order) -> str:
    kinds: list[str] = []
    for item in order.items:
        if item.membership_type:
            kinds.append("membership")
        else:
            kinds.append(item.item_kind or "course")
    if "retake" in kinds:
        return "retake"
    if "exam" in kinds:
        return "exam"
    if kinds and all(kind == "membership" for kind in kinds):
        return "membership"
    return "course"


def _outstanding(order: Order) -> OutstandingPaymentOut | None:
    due = max(0, (order.total_cents or 0) - (order.amount_paid_cents or 0))
    if due <= 0 or order.status in {"paid", "refunded", "cancelled"}:
        return None
    user = order.user
    titles = [item.title for item in order.items if (item.title or "").strip()]
    return OutstandingPaymentOut(
        order_id=order.id,
        order_number=order.number,
        student_name=user.full_name if user else "",
        student_email=user.email if user else "",
        description=", ".join(titles) if titles else order.number,
        item_kind=_outstanding_kind(order),
        amount_due_cents=due,
        currency=order.currency or "usd",
        created_at=order.created_at,
    )


@router.get("", response_model=FeesOverviewOut)
def fees_overview(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FeesOverviewOut:
    courses = db.query(Course).order_by(Course.code.asc()).all()
    promotions = db.query(Promotion).order_by(Promotion.created_at.desc()).all()
    orders = (
        db.query(Order)
        .options(joinedload(Order.user), joinedload(Order.items))
        .filter(Order.status.notin_(["paid", "refunded", "cancelled"]))
        .order_by(Order.created_at.desc())
        .all()
    )
    outstanding = [row for row in (_outstanding(order) for order in orders) if row is not None]
    return FeesOverviewOut(
        courses=[_course_fee(course) for course in courses],
        promotions=[PromotionOut.model_validate(promo) for promo in promotions],
        outstanding=outstanding,
    )


@router.patch("/courses/{course_id}", response_model=CourseFeeOut)
def update_course_fees(
    course_id: int,
    payload: CourseFeeUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CourseFeeOut:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    data = payload.model_dump(exclude_unset=True)
    if not data:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No fee changes were sent.")
    if "price_cents" in data:
        course.price_cents = data["price_cents"]
        if course.draft_meta:
            draft = dict(course.draft_meta)
            draft["price_cents"] = data["price_cents"]
            course.draft_meta = draft
            flag_modified(course, "draft_meta")
    if "exam_fee_cents" in data:
        course.exam_fee_cents = data["exam_fee_cents"]
    if "retake_fee_cents" in data:
        course.retake_fee_cents = data["retake_fee_cents"]
    db.commit()
    db.refresh(course)
    return _course_fee(course)
