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

@router.get("/jobs", response_model=list[JobPostingOut])
def admin_list_jobs(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[JobPostingOut]:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(JobPosting)
        .order_by(JobPosting.posted_on.desc(), JobPosting.sort_order.asc())
        .all()
    )
    return [_job_out(row, now=now) for row in rows]


@router.post("/jobs/sync", response_model=JobSyncOut)
def admin_sync_jobs(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> JobSyncOut:
    from app.services.job_sync import sync_jobs

    result = sync_jobs(db)
    message = (
        f"Synced jobs: {result.created} new, {result.updated} updated, {result.skipped} unchanged."
    )
    if result.errors:
        message += f" Some sources reported errors ({len(result.errors)})."
    return JobSyncOut(
        created=result.created,
        updated=result.updated,
        skipped=result.skipped,
        sources=result.sources or [],
        errors=result.errors or [],
        message=message,
    )


@router.post("/jobs", response_model=JobPostingOut, status_code=status.HTTP_201_CREATED)
def admin_create_job(
    payload: JobPostingCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    if payload.expires_on < payload.posted_on:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be on or after the upload/post date.",
        )
    if payload.attachment_url:
        _validate_upload_url(payload.attachment_url, field="Attachment")
    row = JobPosting(
        title=payload.title.strip(),
        company=(payload.company or "").strip() or None,
        location=(payload.location or "").strip() or None,
        employment_type=(payload.employment_type or "full-time").strip().lower() or "full-time",
        summary=(payload.summary or "").strip() or None,
        description=(payload.description or "").strip() or None,
        apply_url=(payload.apply_url or "").strip() or None,
        attachment_url=payload.attachment_url,
        source_label=(payload.source_label or "").strip() or None,
        posted_on=payload.posted_on,
        expires_on=payload.expires_on,
        published=payload.published,
        featured=payload.featured,
        sort_order=payload.sort_order,
    )
    db.add(row)
    db.flush()
    if row.published:
        from app.services.notifications import notify_students_publication

        company = f" at {row.company}" if row.company else ""
        notify_students_publication(
            db,
            title="New job posted",
            body=f'"{row.title}"{company} is now on the CAISBE job board.',
            kind="job",
            path="/careers/jobs",
        )
    db.commit()
    db.refresh(row)
    return _job_out(row)


@router.patch("/jobs/{job_id}", response_model=JobPostingOut)
def admin_update_job(
    job_id: int,
    payload: JobPostingUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    row = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    was_published = bool(row.published)
    data = payload.model_dump(exclude_unset=True)
    if "attachment_url" in data and data["attachment_url"]:
        _validate_upload_url(data["attachment_url"], field="Attachment")
    for key, value in data.items():
        if isinstance(value, str) and key in {
            "title",
            "company",
            "location",
            "employment_type",
            "summary",
            "description",
            "apply_url",
            "source_label",
        }:
            value = value.strip()
            if key == "title" and not value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required")
            if key == "employment_type" and value:
                value = value.lower()
            if key != "title" and not value:
                value = None
        setattr(row, key, value)
    if row.expires_on < row.posted_on:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be on or after the upload/post date.",
        )
    if row.published and not was_published:
        from app.services.notifications import notify_students_publication

        company = f" at {row.company}" if row.company else ""
        notify_students_publication(
            db,
            title="New job posted",
            body=f'"{row.title}"{company} is now on the CAISBE job board.',
            kind="job",
            path="/careers/jobs",
        )
    db.commit()
    db.refresh(row)
    return _job_out(row)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_job(
    job_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    db.delete(row)
    db.commit()


