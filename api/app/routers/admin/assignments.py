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
    DirectAssignment,
    DirectAssignmentRecipient,
    DirectAssignmentSubmission,
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
    DirectAssignmentCreateIn,
    DirectAssignmentOut,
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

def _apply_assignment_review(
    row: AssignmentSubmission | DirectAssignmentSubmission,
    payload: AssignmentReviewIn,
    *,
    points: int | None,
    assignment_title: str,
    admin: User,
    db: Session,
) -> None:
    from app.services.notifications import notify_users

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


@router.get("/assignment-submissions", response_model=list[AssignmentSubmissionOut])
def admin_list_all_assignment_submissions(
    status_filter: str | None = Query(default=None, alias="status"),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AssignmentSubmissionOut]:
    chapter_query = _assignment_submission_query(db)
    direct_query = _direct_assignment_submission_query(db)
    if status_filter:
        allowed = {"under_review", "passed", "failed"}
        if status_filter not in allowed:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Status must be under_review, passed, or failed.",
            )
        chapter_query = chapter_query.filter(AssignmentSubmission.status == status_filter)
        direct_query = direct_query.filter(DirectAssignmentSubmission.status == status_filter)
    chapter_rows = chapter_query.order_by(AssignmentSubmission.created_at.desc()).limit(500).all()
    direct_rows = direct_query.order_by(DirectAssignmentSubmission.created_at.desc()).limit(500).all()
    combined = [_assignment_submission_out(row) for row in chapter_rows] + [
        _direct_assignment_submission_out(row) for row in direct_rows
    ]
    combined.sort(key=lambda item: item.submitted_at or item.graded_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
    return combined[:500]


@router.get("/students/{student_id}/assignment-submissions", response_model=list[AssignmentSubmissionOut])
def admin_list_assignment_submissions(
    student_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AssignmentSubmissionOut]:
    chapter_rows = (
        _assignment_submission_query(db)
        .filter(AssignmentSubmission.user_id == student_id)
        .order_by(AssignmentSubmission.created_at.desc())
        .all()
    )
    direct_rows = (
        _direct_assignment_submission_query(db)
        .filter(DirectAssignmentSubmission.user_id == student_id)
        .order_by(DirectAssignmentSubmission.created_at.desc())
        .all()
    )
    return [_assignment_submission_out(row) for row in chapter_rows] + [
        _direct_assignment_submission_out(row) for row in direct_rows
    ]


@router.post("/assignment-submissions/{submission_id}/review", response_model=AssignmentSubmissionOut)
def admin_review_assignment(
    submission_id: int,
    payload: AssignmentReviewIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssignmentSubmissionOut:
    row = (
        _assignment_submission_query(db)
        .filter(AssignmentSubmission.id == submission_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    block = row.block
    points = block.points_possible if block else None
    assignment_title = block.title if block and block.title else "Assignment"
    _apply_assignment_review(
        row,
        payload,
        points=points,
        assignment_title=assignment_title,
        admin=admin,
        db=db,
    )
    db.commit()
    row = (
        _assignment_submission_query(db)
        .filter(AssignmentSubmission.id == submission_id)
        .one()
    )
    return _assignment_submission_out(row)


@router.post(
    "/direct-assignment-submissions/{submission_id}/review",
    response_model=AssignmentSubmissionOut,
)
def admin_review_direct_assignment(
    submission_id: int,
    payload: AssignmentReviewIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssignmentSubmissionOut:
    row = (
        _direct_assignment_submission_query(db)
        .filter(DirectAssignmentSubmission.id == submission_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    assignment = row.assignment
    points = assignment.points_possible if assignment else None
    assignment_title = assignment.title if assignment else "Assignment"
    _apply_assignment_review(
        row,
        payload,
        points=points,
        assignment_title=assignment_title,
        admin=admin,
        db=db,
    )
    db.commit()
    row = (
        _direct_assignment_submission_query(db)
        .filter(DirectAssignmentSubmission.id == submission_id)
        .one()
    )
    return _direct_assignment_submission_out(row)


@router.get("/direct-assignments", response_model=list[DirectAssignmentOut])
def admin_list_direct_assignments(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[DirectAssignmentOut]:
    rows = (
        db.query(DirectAssignment)
        .options(
            joinedload(DirectAssignment.course),
            selectinload(DirectAssignment.recipients),
        )
        .order_by(DirectAssignment.created_at.desc())
        .limit(200)
        .all()
    )
    return [
        DirectAssignmentOut(
            id=row.id,
            course_id=row.course_id,
            course_code=row.course.code if row.course else "",
            course_title=row.course.title if row.course else "",
            title=row.title,
            body=row.body,
            file_url=row.file_url,
            file_name=row.file_name,
            points_possible=row.points_possible,
            due_at=row.due_at,
            recipient_count=len(row.recipients or []),
            created_at=row.created_at,
        )
        for row in rows
    ]


@router.post("/direct-assignments", response_model=DirectAssignmentOut, status_code=status.HTTP_201_CREATED)
def admin_create_direct_assignment(
    payload: DirectAssignmentCreateIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> DirectAssignmentOut:
    from app.services.commerce import ACTIVE_ENROLLMENT
    from app.services.notifications import notify_users

    course = db.query(Course).filter(Course.id == payload.course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    student_ids = sorted({int(value) for value in payload.student_ids})
    if not student_ids:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Select at least one student.")
    enrolled_ids = {
        row[0]
        for row in db.query(Enrollment.user_id)
        .filter(
            Enrollment.course_id == course.id,
            Enrollment.user_id.in_(student_ids),
            Enrollment.status.in_(ACTIVE_ENROLLMENT),
        )
        .all()
    }
    missing = [sid for sid in student_ids if sid not in enrolled_ids]
    if missing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Every selected student must be enrolled in this course.",
        )
    title = strip_plain_text(payload.title).strip()
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required.")
    body = strip_plain_text(payload.body or "").strip() or None
    file_url = (payload.file_url or "").strip()
    if not file_url:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Upload a handout file.")
    now = datetime.now(timezone.utc)
    row = DirectAssignment(
        course_id=course.id,
        title=title,
        body=body,
        file_url=file_url,
        file_name=(payload.file_name or "").strip() or None,
        points_possible=payload.points_possible,
        due_at=payload.due_at,
        created_by_id=admin.id,
        created_at=now,
        updated_at=now,
    )
    db.add(row)
    db.flush()
    for user_id in student_ids:
        db.add(DirectAssignmentRecipient(direct_assignment_id=row.id, user_id=user_id))
    notify_users(
        db,
        student_ids,
        title="New assignment",
        body=f"{title} was assigned in {course.code}.",
        kind="assignment_assigned",
        link="/assignments",
    )
    db.commit()
    db.refresh(row)
    return DirectAssignmentOut(
        id=row.id,
        course_id=row.course_id,
        course_code=course.code,
        course_title=course.title,
        title=row.title,
        body=row.body,
        file_url=row.file_url,
        file_name=row.file_name,
        points_possible=row.points_possible,
        due_at=row.due_at,
        recipient_count=len(student_ids),
        created_at=row.created_at,
    )


