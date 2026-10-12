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

@router.put("/courses/{course_id}/final-exam", response_model=FinalExamOut)
def admin_upsert_final_exam(
    course_id: int,
    payload: FinalExamUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> FinalExam:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    exam = db.query(FinalExam).filter(FinalExam.course_id == course_id).first()
    if exam is None:
        exam = FinalExam(course_id=course_id)
        db.add(exam)
        db.flush()

    if payload.title is not None:
        exam.title = strip_plain_text(payload.title) or "Final Exam"
    if payload.pass_percent is not None:
        exam.pass_percent = payload.pass_percent
    if "time_limit_minutes" in payload.model_fields_set:
        exam.time_limit_minutes = payload.time_limit_minutes
    if payload.questions is not None:
        _replace_questions(db, payload.questions, final_exam_id=exam.id)

    if "questions_to_appear" in payload.model_fields_set:
        appear = payload.questions_to_appear
        if appear is not None:
            bank_size = (
                len(payload.questions)
                if payload.questions is not None
                else db.query(QuizQuestion).filter(QuizQuestion.final_exam_id == exam.id).count()
            )
            if appear > bank_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Questions to appear ({appear}) cannot exceed the bank size ({bank_size}).",
                )
        exam.questions_to_appear = appear
    if payload.secure_mode is not None:
        exam.secure_mode = payload.secure_mode
    if payload.max_integrity_violations is not None:
        exam.max_integrity_violations = payload.max_integrity_violations

    db.commit()
    exam = (
        db.query(FinalExam)
        .options(joinedload(FinalExam.questions).joinedload(QuizQuestion.choices))
        .filter(FinalExam.id == exam.id)
        .one()
    )
    return exam


@router.put("/courses/{course_id}/certificate-template", response_model=CertificateTemplateOut)
def admin_upsert_certificate_template(
    course_id: int,
    payload: CertificateTemplateUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CertificateTemplate:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    template = db.query(CertificateTemplate).filter(CertificateTemplate.course_id == course_id).first()
    if template is None:
        template = CertificateTemplate(course_id=course_id)
        db.add(template)
        db.flush()

    if payload.title is not None:
        template.title = strip_plain_text(payload.title) or "Certificate of Completion"
    if payload.body is not None:
        template.body = sanitize_html(payload.body) or ""
    if "program_name" in payload.model_fields_set:
        template.program_name = strip_plain_text(payload.program_name) or None
    db.commit()
    db.refresh(template)
    return template


@router.get("/courses/{course_id}/certificates", response_model=list[CertificateAdminOut])
def admin_list_course_certificates(
    course_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[CertificateAdminOut]:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    rows = (
        db.query(Certificate)
        .options(joinedload(Certificate.user), joinedload(Certificate.course))
        .filter(Certificate.course_id == course_id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )
    return [
        CertificateAdminOut(
            id=row.id,
            certificate_code=row.certificate_code,
            issued_at=row.issued_at,
            student_name=row.user.full_name,
            student_email=row.user.email,
            course_id=row.course_id,
            course_title=row.course.title,
        )
        for row in rows
    ]


@router.put("/quizzes/{quiz_id}", response_model=QuizOut)
def admin_update_quiz(
    quiz_id: int,
    payload: QuizUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Quiz:
    quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
    if quiz is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Quiz not found")
    if payload.title is not None:
        quiz.title = strip_plain_text(payload.title) or "Quiz"
    if payload.questions is not None:
        _replace_questions(db, payload.questions, quiz_id=quiz.id)
    db.commit()
    quiz = (
        db.query(Quiz)
        .options(joinedload(Quiz.questions).joinedload(QuizQuestion.choices))
        .filter(Quiz.id == quiz_id)
        .one()
    )
    return quiz


# --- Uploads ---

@router.get("/membership-certificate-types", response_model=list[MembershipCertificateTypeOut])
def admin_list_membership_certificate_types(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[MembershipCertificateTypeOut]:
    rows = (
        db.query(MembershipCertificateType)
        .order_by(MembershipCertificateType.sort_order.asc(), MembershipCertificateType.id.asc())
        .all()
    )
    return [MembershipCertificateTypeOut.model_validate(row) for row in rows]


@router.patch(
    "/membership-certificate-types/{type_id}",
    response_model=MembershipCertificateTypeOut,
)
def admin_update_membership_certificate_type(
    type_id: int,
    payload: MembershipCertificateTypeUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MembershipCertificateTypeOut:
    row = db.query(MembershipCertificateType).filter(MembershipCertificateType.id == type_id).first()
    if not row:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Membership certificate type not found",
        )
    data = payload.model_dump(exclude_unset=True)
    if "currency" in data and data["currency"] is not None:
        currency = data["currency"].strip().lower()
        if currency not in {"cad", "usd"}:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Currency must be CAD or USD.",
            )
        data["currency"] = currency

    is_student = row.membership_type == "student"
    if is_student:
        # Student membership is always free and lifetime.
        data["price_cents"] = 0
        data["validity_months"] = None
    elif "validity_months" in data:
        months = data["validity_months"]
        if months is None or months < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Non-student memberships require a validity period of at least 1 month.",
            )

    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Label, title, and body cannot be empty.",
                )
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return MembershipCertificateTypeOut.model_validate(row)
