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

@router.get("/contact-messages", response_model=list[ContactMessageOut])
def admin_list_contact_messages(
    status_filter: str | None = Query(default=None, alias="status"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ContactMessageOut]:
    query = db.query(ContactMessage)
    if status_filter:
        wanted = status_filter.strip().lower()
        if wanted not in CONTACT_STATUSES:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status filter.")
        query = query.filter(ContactMessage.status == wanted)
    rows = query.order_by(ContactMessage.created_at.desc(), ContactMessage.id.desc()).limit(500).all()
    return [ContactMessageOut.model_validate(row) for row in rows]


@router.get("/contact-messages/{message_id}", response_model=ContactMessageOut)
def admin_get_contact_message(
    message_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContactMessageOut:
    row = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact message not found")
    if row.status == "new":
        row.status = "read"
        db.commit()
        db.refresh(row)
    return ContactMessageOut.model_validate(row)


@router.patch("/contact-messages/{message_id}", response_model=ContactMessageOut)
def admin_update_contact_message_status(
    message_id: int,
    payload: ContactMessageStatusIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContactMessageOut:
    row = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact message not found")
    next_status = payload.status.strip().lower()
    if next_status not in CONTACT_STATUSES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status.")
    row.status = next_status
    db.commit()
    db.refresh(row)
    return ContactMessageOut.model_validate(row)


@router.post("/contact-messages/{message_id}/reply", response_model=ContactMessageOut)
def admin_reply_contact_message(
    message_id: int,
    payload: ContactMessageReplyIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContactMessageOut:
    row = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact message not found")

    body = payload.body.strip()
    subject = payload.subject.strip() or "Re: Your message to CAISBE"
    full_name = f"{row.first_name} {row.last_name}".strip()
    html_body = (
        f"<p>Hello {full_name},</p>"
        f"<p>{body.replace(chr(10), '<br>')}</p>"
        "<p>— CAISBE</p>"
        "<hr>"
        "<p><small>In reply to your message:</small></p>"
        f"<blockquote>{row.comments.replace(chr(10), '<br>')}</blockquote>"
    )
    try:
        send_email(
            to=row.email,
            subject=subject,
            html_body=html_body,
            purpose="contact",
        )
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc)) from exc

    row.admin_reply = body
    row.replied_at = datetime.now(timezone.utc)
    row.replied_by_admin_id = admin.id
    row.status = "replied"
    db.commit()
    db.refresh(row)
    return ContactMessageOut.model_validate(row)


@router.delete("/contact-messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_contact_message(
    message_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(ContactMessage).filter(ContactMessage.id == message_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Contact message not found")
    db.delete(row)
    db.commit()


