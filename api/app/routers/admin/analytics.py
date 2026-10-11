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

@router.get("/site-visits/stats", response_model=SiteVisitStatsOut)
def admin_site_visit_stats(
    days: int | None = Query(default=None, ge=1, le=365),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SiteVisitStatsOut:
    return site_visit_stats(db, days=days)


@router.get("/site-visits", response_model=list[SiteVisitOut])
def admin_list_site_visits(
    path: str | None = Query(default=None, max_length=512),
    landing_only: bool = Query(default=False),
    days: int | None = Query(default=None, ge=1, le=365),
    country: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=200, ge=1, le=1000),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SiteVisitOut]:
    query = db.query(SiteVisit)
    if days:
        now = datetime.now(timezone.utc)
        start_today = now.replace(hour=0, minute=0, second=0, microsecond=0)
        since = start_today - timedelta(days=max(days, 1) - 1)
        query = query.filter(SiteVisit.visited_at >= since)
    if landing_only:
        query = query.filter(SiteVisit.path == "/")
    elif path:
        query = query.filter(SiteVisit.path == path)
    rows = query.order_by(SiteVisit.visited_at.desc()).limit(5000).all()
    selected = rows
    if country:
        wanted = country.strip().casefold()
        selected = [
            row
            for row in rows
            if display_country(row.country, row.timezone).casefold() == wanted
        ]
    payload: list[SiteVisitOut] = []
    for row in selected[:limit]:
        item = SiteVisitOut.model_validate(row)
        item.location_country = display_country(row.country, row.timezone)
        item.location_city = display_city(row.city, row.timezone)
        payload.append(item)
    return payload


# --- Students ---


