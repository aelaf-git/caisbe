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
    ExamSession,
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
    ExamIdentityOut,
    ExamIdentityReviewIn,
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

@router.get("/students", response_model=list[AdminStudentOut])
def admin_list_students(
    q: str | None = Query(default=None, max_length=120),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminStudentOut]:
    students = (
        db.query(User)
        .options(joinedload(User.enrollments).joinedload(Enrollment.course))
        .filter(User.role == "student")
        .order_by(User.full_name.asc())
        .all()
    )

    needle = q.strip().lower() if q else None
    if needle:
        matched: list[User] = []
        for student in students:
            if needle in student.full_name.lower() or needle in student.email.lower():
                matched.append(student)
                continue
            for enrollment in student.enrollments:
                course = enrollment.course
                if needle in course.title.lower() or needle in course.code.lower():
                    matched.append(student)
                    break
        students = matched

    return [
        AdminStudentOut(
            id=student.id,
            full_name=student.full_name,
            email=student.email,
            phone=student.phone,
            country=student.country,
            city=student.city,
            address=student.address,
            organization=student.organization,
            job_title=student.job_title,
            membership_date=student.membership_date,
            membership_type=student.membership_type,
            membership_status=student.membership_status,
            enrollments=[
                AdminStudentEnrollmentOut(
                    course_id=enrollment.course_id,
                    course_code=enrollment.course.code,
                    course_title=enrollment.course.title,
                    progress=enrollment.progress,
                    status=enrollment.status,
                    enrolled_at=enrollment.enrolled_at,
                )
                for enrollment in sorted(
                    student.enrollments,
                    key=lambda row: row.enrolled_at,
                    reverse=True,
                )
            ],
        )
        for student in students
    ]


# --- Enrollments ---


@router.get("/enrollments/stats", response_model=AdminEnrollmentStatsOut)
def admin_enrollment_stats(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminEnrollmentStatsOut:
    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.course))
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )

    total = len(enrollments)
    completed = sum(1 for row in enrollments if _enrollment_completed(row))
    in_progress = sum(1 for row in enrollments if _enrollment_in_progress(row))
    not_started = sum(1 for row in enrollments if _enrollment_not_started(row))
    completion_rate = round(100 * completed / total) if total else 0

    cutoff = datetime.now(timezone.utc) - timedelta(days=30)
    new_last_30_days = sum(
        1
        for row in enrollments
        if row.enrolled_at and row.enrolled_at >= cutoff
    )

    by_course_map: dict[int, dict] = {}
    for row in enrollments:
        course = row.course
        bucket = by_course_map.get(course.id)
        if bucket is None:
            bucket = {
                "course_id": course.id,
                "course_code": course.code,
                "course_title": course.title,
                "enrollment_count": 0,
                "completed_count": 0,
                "progress_sum": 0,
            }
            by_course_map[course.id] = bucket
        bucket["enrollment_count"] += 1
        bucket["progress_sum"] += row.progress
        if _enrollment_completed(row):
            bucket["completed_count"] += 1

    by_course = [
        AdminEnrollmentCourseStatOut(
            course_id=bucket["course_id"],
            course_code=bucket["course_code"],
            course_title=bucket["course_title"],
            enrollment_count=bucket["enrollment_count"],
            completed_count=bucket["completed_count"],
            average_progress=round(bucket["progress_sum"] / bucket["enrollment_count"])
            if bucket["enrollment_count"]
            else 0,
        )
        for bucket in by_course_map.values()
    ]
    by_course.sort(key=lambda row: (-row.enrollment_count, row.course_code))

    return AdminEnrollmentStatsOut(
        total_enrollments=total,
        in_progress=in_progress,
        completed=completed,
        not_started=not_started,
        completion_rate=completion_rate,
        new_last_30_days=new_last_30_days,
        by_course=by_course,
    )


@router.get("/enrollments", response_model=list[AdminEnrollmentOut])
def admin_list_enrollments(
    q: str | None = Query(default=None, max_length=120),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminEnrollmentOut]:
    enrollments = (
        db.query(Enrollment)
        .options(joinedload(Enrollment.user), joinedload(Enrollment.course))
        .order_by(Enrollment.enrolled_at.desc())
        .all()
    )

    needle = q.strip().lower() if q else None
    if needle:
        filtered: list[Enrollment] = []
        for row in enrollments:
            if needle in row.user.full_name.lower() or needle in row.user.email.lower():
                filtered.append(row)
                continue
            if needle in row.course.title.lower() or needle in row.course.code.lower():
                filtered.append(row)
        enrollments = filtered

    return [
        AdminEnrollmentOut(
            id=row.id,
            student_id=row.user_id,
            student_name=row.user.full_name,
            student_email=row.user.email,
            course_id=row.course_id,
            course_code=row.course.code,
            course_title=row.course.title,
            status=row.status,
            progress=row.progress,
            enrolled_at=row.enrolled_at,
        )
        for row in enrollments
    ]


# --- Courses ---


@router.get("/students/{student_id}", response_model=AdminStudentOut)
def admin_get_student(
    student_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminStudentOut:
    student = (
        db.query(User)
        .options(joinedload(User.enrollments).joinedload(Enrollment.course))
        .filter(User.id == student_id, User.role == "student")
        .first()
    )
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return AdminStudentOut(
        id=student.id,
        full_name=student.full_name,
        email=student.email,
        phone=student.phone,
        country=student.country,
        city=student.city,
        address=student.address,
        organization=student.organization,
        job_title=student.job_title,
        membership_date=student.membership_date,
        membership_type=student.membership_type,
        membership_status=student.membership_status,
        enrollments=[
            AdminStudentEnrollmentOut(
                course_id=enrollment.course_id,
                course_code=enrollment.course.code,
                course_title=enrollment.course.title,
                progress=enrollment.progress,
                status=enrollment.status,
                enrolled_at=enrollment.enrolled_at,
            )
            for enrollment in student.enrollments
        ],
    )


@router.get("/students/{student_id}/documents", response_model=list[UserDocumentOut])
def admin_list_student_documents(
    student_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[UserDocumentOut]:
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    rows = (
        db.query(UserDocument)
        .filter(UserDocument.user_id == student_id)
        .order_by(UserDocument.id.desc())
        .all()
    )
    return [UserDocumentOut.model_validate(row) for row in rows]


@router.get("/students/{student_id}/exam-integrity", response_model=list[ExamIntegrityEventOut])
def admin_student_exam_integrity(
    student_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ExamIntegrityEvent]:
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return (
        db.query(ExamIntegrityEvent)
        .filter(ExamIntegrityEvent.user_id == student_id)
        .order_by(ExamIntegrityEvent.created_at.desc(), ExamIntegrityEvent.id.desc())
        .limit(200)
        .all()
    )


@router.get("/students/{student_id}/exam-identity", response_model=list[ExamIdentityOut])
def admin_student_exam_identity(
    student_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ExamIdentityOut]:
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    rows = (
        db.query(ExamSession)
        .options(joinedload(ExamSession.final_exam).joinedload(FinalExam.course))
        .filter(
            ExamSession.user_id == student_id,
            ExamSession.id_photo_url.isnot(None),
            ExamSession.face_photo_url.isnot(None),
        )
        .order_by(ExamSession.id.desc())
        .limit(50)
        .all()
    )
    out: list[ExamIdentityOut] = []
    for session in rows:
        exam = session.final_exam
        course = exam.course if exam is not None else None
        if exam is None or course is None:
            continue
        out.append(
            ExamIdentityOut(
                session_id=session.id,
                final_exam_id=exam.id,
                course_id=course.id,
                course_code=course.code,
                course_title=course.title,
                exam_title=exam.title,
                student_full_name=student.full_name,
                id_photo_url=session.id_photo_url,
                face_photo_url=session.face_photo_url,
                identity_status=session.identity_status,
                identity_reviewed_at=session.identity_reviewed_at,
                identity_reviewed_by_id=session.identity_reviewed_by_id,
                identity_review_note=session.identity_review_note,
                secure_ok_at=session.secure_ok_at,
            )
        )
    return out


@router.post(
    "/students/{student_id}/exam-identity/{session_id}/review",
    response_model=ExamIdentityOut,
)
def admin_review_exam_identity(
    student_id: int,
    session_id: int,
    payload: ExamIdentityReviewIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ExamIdentityOut:
    student = db.query(User).filter(User.id == student_id, User.role == "student").first()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    session = (
        db.query(ExamSession)
        .options(joinedload(ExamSession.final_exam).joinedload(FinalExam.course))
        .filter(ExamSession.id == session_id, ExamSession.user_id == student_id)
        .first()
    )
    if session is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam identity session not found")
    if not (session.id_photo_url or "").strip() or not (session.face_photo_url or "").strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This session has no identity photos to review.",
        )
    if session.identity_status not in {None, "pending", "rejected", "approved"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid identity status.")

    now = datetime.now(timezone.utc)
    note = (payload.note or "").strip() or None
    session.identity_status = payload.status
    session.identity_reviewed_at = now
    session.identity_reviewed_by_id = admin.id
    session.identity_review_note = note
    if payload.status == "rejected":
        session.secure_ok_at = None

    exam = session.final_exam
    if exam is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam not found")

    from app.routers.courses.support import _record_integrity_event

    _record_integrity_event(
        db,
        user=student,
        exam=exam,
        session=session,
        phase="pre",
        event_type="identity_approved" if payload.status == "approved" else "identity_rejected",
        detail={
            "reviewed_by_id": admin.id,
            "note": note,
            "student_full_name": student.full_name,
        },
    )
    db.commit()
    db.refresh(session)

    course = exam.course
    return ExamIdentityOut(
        session_id=session.id,
        final_exam_id=exam.id,
        course_id=course.id,
        course_code=course.code,
        course_title=course.title,
        exam_title=exam.title,
        student_full_name=student.full_name,
        id_photo_url=session.id_photo_url,
        face_photo_url=session.face_photo_url,
        identity_status=session.identity_status,
        identity_reviewed_at=session.identity_reviewed_at,
        identity_reviewed_by_id=session.identity_reviewed_by_id,
        identity_review_note=session.identity_review_note,
        secure_ok_at=session.secure_ok_at,
    )


