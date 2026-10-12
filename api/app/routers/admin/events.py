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

@router.get("/events", response_model=list[IndustryEventOut])
def admin_list_events(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[IndustryEventOut]:
    rows = (
        db.query(IndustryEvent)
        .order_by(IndustryEvent.starts_on.asc(), IndustryEvent.sort_order.asc())
        .all()
    )
    return [IndustryEventOut.model_validate(row) for row in rows]


@router.post("/events", response_model=IndustryEventOut, status_code=status.HTTP_201_CREATED)
def admin_create_event(
    payload: IndustryEventCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> IndustryEventOut:
    if payload.report_file_url:
        _validate_upload_url(payload.report_file_url, field="Report file")
    event = IndustryEvent(
        title=payload.title.strip(),
        summary=(payload.summary or "").strip() or None,
        location=(payload.location or "").strip() or None,
        region=(payload.region or "").strip() or None,
        event_type=(payload.event_type or "calendar").strip().lower() or "calendar",
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        source_name=(payload.source_name or "").strip() or None,
        source_url=(payload.source_url or "").strip() or None,
        report_file_url=payload.report_file_url,
        cpd_hours=payload.cpd_hours,
        published=payload.published,
        featured=payload.featured,
        sort_order=payload.sort_order,
    )
    db.add(event)
    db.flush()
    if event.published:
        from app.services.notifications import EVENT_TYPE_PATHS, notify_students_publication

        notify_students_publication(
            db,
            title="New event posted",
            body=f'"{event.title}" is now on the CAISBE events calendar.',
            kind="event",
            path=EVENT_TYPE_PATHS.get(event.event_type, "/events"),
        )
    db.commit()
    db.refresh(event)
    return IndustryEventOut.model_validate(event)


@router.patch("/events/{event_id}", response_model=IndustryEventOut)
def admin_update_event(
    event_id: int,
    payload: IndustryEventUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> IndustryEventOut:
    event = db.query(IndustryEvent).filter(IndustryEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    was_published = bool(event.published)
    data = payload.model_dump(exclude_unset=True)
    if "report_file_url" in data and data["report_file_url"]:
        _validate_upload_url(data["report_file_url"], field="Report file")
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip() or None if key != "title" and key != "event_type" else value.strip()
            if key == "title" and not value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required")
            if key == "event_type" and value:
                value = value.lower()
        setattr(event, key, value)
    if event.published and not was_published:
        from app.services.notifications import EVENT_TYPE_PATHS, notify_students_publication

        notify_students_publication(
            db,
            title="New event posted",
            body=f'"{event.title}" is now on the CAISBE events calendar.',
            kind="event",
            path=EVENT_TYPE_PATHS.get(event.event_type, "/events"),
        )
    db.commit()
    db.refresh(event)
    return IndustryEventOut.model_validate(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event(
    event_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    event = db.query(IndustryEvent).filter(IndustryEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()


