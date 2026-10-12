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

@router.get("/news", response_model=list[NewsPostOut])
def admin_list_news(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[NewsPostOut]:
    rows = (
        db.query(NewsPost)
        .order_by(NewsPost.posted_on.desc(), NewsPost.sort_order.asc())
        .all()
    )
    return [_news_out(row) for row in rows]


@router.post("/news", response_model=NewsPostOut, status_code=status.HTTP_201_CREATED)
def admin_create_news(
    payload: NewsPostCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> NewsPostOut:
    if payload.cover_url:
        _validate_upload_url(payload.cover_url, field="Cover image")
    image_urls = _normalize_url_list(payload.image_urls)
    video_urls = _normalize_url_list(payload.video_urls)
    for url in image_urls:
        _validate_upload_url(url, field="Image")
    for url in video_urls:
        _validate_upload_url(url, field="Video")
    slug_base = (payload.slug or payload.title).strip()
    row = NewsPost(
        title=payload.title.strip(),
        slug=_unique_news_slug(db, slug_base),
        short_description=(payload.short_description or "").strip() or None,
        long_description=(payload.long_description or "").strip() or None,
        external_url=payload.external_url,
        cover_url=payload.cover_url,
        image_urls=image_urls or None,
        video_urls=video_urls or None,
        tag=(payload.tag or "").strip() or None,
        posted_on=payload.posted_on,
        published=payload.published,
        featured=payload.featured,
        sort_order=payload.sort_order,
    )
    db.add(row)
    db.flush()
    if row.published:
        from app.services.notifications import notify_students_publication

        blurb = (row.short_description or row.title).strip()
        notify_students_publication(
            db,
            title="New announcement",
            body=blurb[:500],
            kind="announcement",
            path=f"/news/{row.slug}",
        )
    db.commit()
    db.refresh(row)
    return _news_out(row)


@router.patch("/news/{post_id}", response_model=NewsPostOut)
def admin_update_news(
    post_id: int,
    payload: NewsPostUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> NewsPostOut:
    row = db.query(NewsPost).filter(NewsPost.id == post_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News post not found")
    was_published = bool(row.published)
    data = payload.model_dump(exclude_unset=True)
    if "cover_url" in data and data["cover_url"]:
        _validate_upload_url(data["cover_url"], field="Cover image")
    if "image_urls" in data:
        data["image_urls"] = _normalize_url_list(data["image_urls"])
        for url in data["image_urls"]:
            _validate_upload_url(url, field="Image")
        data["image_urls"] = data["image_urls"] or None
    if "video_urls" in data:
        data["video_urls"] = _normalize_url_list(data["video_urls"])
        for url in data["video_urls"]:
            _validate_upload_url(url, field="Video")
        data["video_urls"] = data["video_urls"] or None
    if "slug" in data and data["slug"]:
        data["slug"] = _unique_news_slug(db, data["slug"], exclude_id=post_id)
    elif "title" in data and data["title"] and "slug" not in data:
        # Keep existing slug when title changes unless slug was explicitly sent.
        pass
    for key, value in data.items():
        if isinstance(value, str) and key in {
            "title",
            "short_description",
            "long_description",
            "tag",
            "slug",
        }:
            value = value.strip()
            if key == "title" and not value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required")
            if key != "title" and key != "slug" and not value:
                value = None
        setattr(row, key, value)
    if row.published and not was_published:
        from app.services.notifications import notify_students_publication

        blurb = (row.short_description or row.title).strip()
        notify_students_publication(
            db,
            title="New announcement",
            body=blurb[:500],
            kind="announcement",
            path=f"/news/{row.slug}",
        )
    db.commit()
    db.refresh(row)
    return _news_out(row)


@router.delete("/news/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_news(
    post_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(NewsPost).filter(NewsPost.id == post_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="News post not found")
    db.delete(row)
    db.commit()


