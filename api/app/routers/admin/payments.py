from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy.orm.attributes import flag_modified
from starlette.datastructures import UploadFile

from app.config import settings
from app.db import get_db
from app.security.auth import hash_password, require_admin, verify_password
from app.security.html_sanitize import sanitize_html, strip_plain_text
from app.models import (
    Certificate,
    CertificateTemplate,
    Chapter,
    AssignmentSubmission,
    ContactMessage,
    ContentBlock,
    Course,
    Enrollment,
    ExamIntegrityEvent,
    FinalExam,
    IndustryEvent,
    JobPosting,
    Lesson,
    MediaAsset,
    MembershipCertificate,
    MembershipCertificateType,
    NewsPost,
    Testimonial,
    NewsletterCampaign,
    NewsletterSubscriber,
    QuizAttempt,
    SiteVisit,
    Quiz,
    QuizChoice,
    QuizQuestion,
    User,
    MembershipApplication,
    NotificationBroadcast,
    Order,
    Payment,
    Promotion,
    UserDocument,
)
from app.schemas.commerce import OrderItemOut, PaymentOut, PromotionIn, PromotionOut
from app.schemas.admin_ops import (
    AdminPasswordChange,
    AdminReportsOut,
    AppSettingsOut,
    AppSettingsUpdate,
    CourseReportRow,
)
from app.schemas.courses import (
    AdminEnrollmentCourseStatOut,
    AdminEnrollmentOut,
    AdminEnrollmentStatsOut,
    AdminStudentEnrollmentOut,
    AdminStudentOut,
    BlockReorderRequest,
    ChapterCreate,
    ChapterOut,
    ChapterUpdate,
    ContentBlockCreate,
    ContentBlockOut,
    ContentBlockUpdate,
    CertificateTemplateOut,
    CertificateTemplateUpdate,
    CertificateAdminOut,
    CourseCreate,
    AssignmentReviewIn,
    AssignmentSubmissionOut,
    CourseDetailAdminOut,
    AdminCourseListOut,
    CourseOut,
    CourseUpdate,
    ExamIntegrityEventOut,
    FinalExamOut,
    FinalExamUpdate,
    LessonCreate,
    LessonOut,
    LessonUpdate,
    QuizChoiceIn,
    QuizOut,
    QuizQuestionIn,
    QuizUpdate,
    UploadOut,
    UserDocumentOut,
)
from app.schemas.analytics import AdminDashboardOut, SiteVisitOut, SiteVisitStatsOut
from app.schemas.media import (
    MediaAssetCreateIn,
    MediaAssetOut,
    MediaAssetUpdateIn,
    NewsletterCampaignOut,
    NewsletterSendIn,
    NewsletterSendOut,
    NewsletterSubscriberOut,
)
from app.schemas.events import (
    IndustryEventCreateIn,
    IndustryEventOut,
    IndustryEventUpdateIn,
)
from app.schemas.jobs import (
    JobPostingCreateIn,
    JobPostingOut,
    JobPostingUpdateIn,
    JobSyncOut,
)
from app.schemas.testimonials import (
    TestimonialCreateIn,
    TestimonialOut,
    TestimonialUpdateIn,
)
from app.schemas.contact import (
    CONTACT_STATUSES,
    ContactMessageOut,
    ContactMessageReplyIn,
    ContactMessageStatusIn,
)
from app.schemas.membership_certificates import (
    MembershipCertificateTypeOut,
    MembershipCertificateTypeUpdateIn,
)
from app.schemas.news import (
    NewsPostCreateIn,
    NewsPostOut,
    NewsPostUpdateIn,
    slugify_title,
)
from app.schemas.notifications import (
    AdminNotificationBroadcastOut,
    AdminNotificationSendIn,
    AdminNotificationSendOut,
)
from app.services.analytics import display_city, display_country, site_visit_stats
from app.services.email import EmailDeliveryError, load_upload_attachment, send_email
from app.services.settings import default_pass_percent, get_settings_map, set_settings, hero_transition_ms
from app.services.hero import ensure_default_hero_slides

from app.routers.admin.router import router
from app.routers.admin.support import *  # noqa: F403

@router.get("/payments", response_model=list[PaymentOut])
def admin_list_payments(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[PaymentOut]:
    rows = (
        db.query(Payment)
        .options(
            joinedload(Payment.user),
            joinedload(Payment.order).joinedload(Order.items),
        )
        .order_by(Payment.created_at.desc())
        .limit(200)
        .all()
    )
    return [_payment_out(row) for row in rows]


@router.get("/payments/{payment_id}", response_model=PaymentOut)
def admin_get_payment(
    payment_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaymentOut:
    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items))
        .filter(Payment.id == payment_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return _payment_out(row)


@router.post("/payments/{payment_id}/print", response_model=PaymentOut)
def admin_mark_receipt_printed(
    payment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaymentOut:
    row = db.query(Payment).options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items)).filter(Payment.id == payment_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    row.receipt_printed_at = datetime.now(timezone.utc)
    row.reviewed_at = row.reviewed_at or datetime.now(timezone.utc)
    row.reviewed_by_id = admin.id
    db.commit()
    db.refresh(row)
    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items))
        .filter(Payment.id == payment_id)
        .one()
    )
    return _payment_out(row)


@router.post("/payments/{payment_id}/refund", response_model=PaymentOut)
def admin_refund_payment(
    payment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaymentOut:
    from app.services.commerce import refund_payment

    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items), joinedload(Payment.order).joinedload(Order.invoices))
        .filter(Payment.id == payment_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if row.status == "refunded":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already refunded")
    try:
        refund_payment(db, row, admin)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items))
        .filter(Payment.id == payment_id)
        .one()
    )
    return _payment_out(row)


@router.get("/promotions", response_model=list[PromotionOut])
def admin_list_promotions(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Promotion]:
    return db.query(Promotion).order_by(Promotion.created_at.desc()).all()


@router.post("/promotions", response_model=PromotionOut, status_code=status.HTTP_201_CREATED)
def admin_create_promotion(
    payload: PromotionIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Promotion:
    code = payload.code.strip().upper()
    if db.query(Promotion).filter(Promotion.code == code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code already exists")
    kind = _promotion_kind(payload.kind)
    promo = Promotion(
        code=code,
        description=payload.description.strip(),
        kind=kind,
        percent_off=payload.percent_off,
        amount_off_cents=payload.amount_off_cents,
        complimentary=payload.complimentary or (payload.percent_off or 0) >= 100,
        max_redemptions=payload.max_redemptions,
        expires_at=payload.expires_at,
        course_id=payload.course_id,
        active=payload.active,
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.patch("/promotions/{promotion_id}", response_model=PromotionOut)
def admin_update_promotion(
    promotion_id: int,
    payload: PromotionIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Promotion:
    promo = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")
    code = payload.code.strip().upper()
    clash = db.query(Promotion).filter(Promotion.code == code, Promotion.id != promotion_id).first()
    if clash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code already exists")
    promo.code = code
    promo.description = payload.description.strip()
    promo.kind = _promotion_kind(payload.kind)
    promo.percent_off = payload.percent_off
    promo.amount_off_cents = payload.amount_off_cents
    promo.complimentary = payload.complimentary or (payload.percent_off or 0) >= 100
    promo.max_redemptions = payload.max_redemptions
    promo.expires_at = payload.expires_at
    promo.course_id = payload.course_id
    promo.active = payload.active
    db.commit()
    db.refresh(promo)
    return promo


