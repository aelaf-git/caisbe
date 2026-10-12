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

@router.get("/assignment-submissions", response_model=list[AssignmentSubmissionOut])
def admin_list_all_assignment_submissions(
    status_filter: str | None = Query(default=None, alias="status"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AssignmentSubmissionOut]:
    query = _assignment_submission_query(db)
    if status_filter:
        allowed = {"under_review", "passed", "failed"}
        if status_filter not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must be under_review, passed, or failed.",
            )
        query = query.filter(AssignmentSubmission.status == status_filter)
    rows = query.order_by(AssignmentSubmission.created_at.desc()).limit(500).all()
    return [_assignment_submission_out(row) for row in rows]


@router.get("/students/{student_id}/assignment-submissions", response_model=list[AssignmentSubmissionOut])
def admin_list_assignment_submissions(
    student_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AssignmentSubmissionOut]:
    rows = (
        _assignment_submission_query(db)
        .filter(AssignmentSubmission.user_id == student_id)
        .order_by(AssignmentSubmission.created_at.desc())
        .all()
    )
    return [_assignment_submission_out(row) for row in rows]


@router.post("/assignment-submissions/{submission_id}/review", response_model=AssignmentSubmissionOut)
def admin_review_assignment(
    submission_id: int,
    payload: AssignmentReviewIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssignmentSubmissionOut:
    from app.services.notifications import notify_users

    row = (
        _assignment_submission_query(db)
        .filter(AssignmentSubmission.id == submission_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    block = row.block
    points = block.points_possible if block else None
    if points is not None:
        if payload.score is None or payload.score > points:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Enter a score from 0 to {points}.",
            )
        row.score = payload.score
    elif payload.score is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assignment does not use a point score.",
        )
    else:
        row.score = None
    row.feedback = (payload.feedback or "").strip() or None
    row.status = payload.status
    row.graded_at = datetime.now(timezone.utc)
    row.graded_by_id = admin.id
    row.updated_at = row.graded_at
    assignment_title = block.title if block and block.title else "Assignment"
    if points is not None and row.score is not None:
        body = f"{assignment_title} was marked {payload.status} with a score of {row.score}/{points}."
    else:
        body = f"{assignment_title} was marked {payload.status}."
    if row.feedback:
        body = f"{body} Your instructor left feedback."
    notify_users(
        db,
        [row.user_id],
        title="Assignment evaluated",
        body=body,
        kind="assignment_graded",
        link="/assignments",
    )
    db.commit()
    db.refresh(row)
    row = (
        _assignment_submission_query(db)
        .filter(AssignmentSubmission.id == submission_id)
        .one()
    )
    return _assignment_submission_out(row)


