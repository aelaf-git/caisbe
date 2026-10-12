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

@router.get("/dashboard", response_model=AdminDashboardOut)
def admin_dashboard(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardOut:
    courses = db.query(Course).all()
    enrollments = db.query(Enrollment).all()
    visit_stats = site_visit_stats(db)
    completed = sum(1 for row in enrollments if row.status == "completed" or row.progress >= 100)
    in_progress = sum(
        1 for row in enrollments if not (row.status == "completed" or row.progress >= 100) and 1 <= row.progress <= 99
    )
    total = len(enrollments)
    return AdminDashboardOut(
        students=db.query(User).filter(User.role == "student").count(),
        courses_total=len(courses),
        courses_published=sum(1 for row in courses if row.status == "published"),
        courses_draft=sum(1 for row in courses if (row.status or "draft") == "draft"),
        total_enrollments=total,
        enrollments_in_progress=in_progress,
        enrollments_completed=completed,
        completion_rate=round(100 * completed / total) if total else 0,
        certificates=db.query(Certificate).count(),
        membership_certificates=db.query(MembershipCertificate).count(),
        newsletter_subscribers=db.query(NewsletterSubscriber)
        .filter(NewsletterSubscriber.unsubscribed_at.is_(None))
        .count(),
        newsletters_sent=db.query(NewsletterCampaign).count(),
        contact_messages_open=db.query(ContactMessage)
        .filter(ContactMessage.status.in_(("new", "read")))
        .count(),
        magazines_published=db.query(MediaAsset)
        .filter(MediaAsset.category == "magazine", MediaAsset.published.is_(True))
        .count(),
        site_views_today=visit_stats.views_today,
        site_unique_today=visit_stats.unique_today,
        landing_views=visit_stats.landing_views,
        landing_unique_visitors=visit_stats.landing_unique_visitors,
    )


@router.get("/settings", response_model=AppSettingsOut)
def admin_get_settings(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AppSettingsOut:
    return _settings_out(db)


@router.put("/settings", response_model=AppSettingsOut)
def admin_update_settings(
    payload: AppSettingsUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AppSettingsOut:
    updates: dict[str, str] = {}
    if payload.institute_name is not None:
        updates["institute_name"] = payload.institute_name.strip()
    if payload.default_pass_percent is not None:
        updates["default_pass_percent"] = str(payload.default_pass_percent)
    if payload.membership_cert_title is not None:
        updates["membership_cert_title"] = payload.membership_cert_title.strip()
    if payload.completion_cert_title is not None:
        updates["completion_cert_title"] = payload.completion_cert_title.strip()
    if payload.ui_theme is not None:
        updates["ui_theme"] = payload.ui_theme
    if payload.ui_font_size is not None:
        updates["ui_font_size"] = payload.ui_font_size
    if payload.ui_font_body is not None:
        updates["ui_font_body"] = payload.ui_font_body
    if payload.ui_font_display is not None:
        updates["ui_font_display"] = payload.ui_font_display
    if payload.hero_transition_ms is not None:
        updates["hero_transition_ms"] = str(payload.hero_transition_ms)
    if updates:
        set_settings(db, updates)
        db.commit()
    return _settings_out(db)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def admin_change_password(
    payload: AdminPasswordChange,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()


@router.get("/reports", response_model=AdminReportsOut)
def admin_reports(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminReportsOut:
    enrollments = db.query(Enrollment).all()
    completed = sum(1 for row in enrollments if row.status == "completed" or row.progress >= 100)
    in_progress = sum(
        1 for row in enrollments if not (row.status == "completed" or row.progress >= 100) and 1 <= row.progress <= 99
    )
    total = len(enrollments)
    quiz_attempts = db.query(QuizAttempt).count()
    quiz_passed = db.query(QuizAttempt).filter(QuizAttempt.passed.is_(True)).count()

    courses = db.query(Course).order_by(Course.code.asc()).all()
    course_rows: list[CourseReportRow] = []
    for course in courses:
        course_enrollments = [row for row in enrollments if row.course_id == course.id]
        course_completed = sum(
            1 for row in course_enrollments if row.status == "completed" or row.progress >= 100
        )
        course_total = len(course_enrollments)
        certs = db.query(Certificate).filter(Certificate.course_id == course.id).count()
        course_rows.append(
            CourseReportRow(
                course_id=course.id,
                course_code=course.code,
                course_title=course.title,
                enrollments=course_total,
                completed=course_completed,
                completion_percent=round(100 * course_completed / course_total) if course_total else 0,
                certificates_issued=certs,
            )
        )

    return AdminReportsOut(
        students=db.query(User).filter(User.role == "student").count(),
        total_enrollments=total,
        enrollments_completed=completed,
        enrollments_in_progress=in_progress,
        completion_rate=round(100 * completed / total) if total else 0,
        membership_certificates=db.query(MembershipCertificate).count(),
        completion_certificates=db.query(Certificate).count(),
        quiz_attempts=quiz_attempts,
        quiz_passed=quiz_passed,
        courses=course_rows,
    )


# --- Site visits ---


