from __future__ import annotations

import json
import random
import secrets
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Request, status
from starlette.datastructures import UploadFile
from sqlalchemy.orm import Session, joinedload, selectinload

from app.config import settings
from app.db import get_db
from app.security.auth import get_current_user
from app.security.html_sanitize import sanitize_html, strip_plain_text
from app.security.limiter import limiter
from app.models import (
    Certificate,
    CertificateTemplate,
    Chapter,
    ContentBlock,
    Course,
    Enrollment,
    ExamIntegrityEvent,
    ExamSession,
    FinalExam,
    Lesson,
    AssignmentSubmission,
    BlockCompletion,
    LessonProgress,
    MembershipApplication,
    MembershipCertificate,
    Quiz,
    QuizAttempt,
    QuizQuestion,
    User,
    UserDocument,
)
from app.schemas.auth import MembershipApplicationIn, MembershipApplicationOut
from app.schemas.courses import (
    AssignmentSubmitIn,
    StudentAssignmentDetailOut,
    StudentAssignmentOut,
    CertificateOut,
    UploadOut,
    CertificateVerifyOut,
    CourseDetailStudentOut,
    CourseOut,
    EnrollmentOut,
    ExamIntegrityBatchIn,
    ExamIntegrityEventOut,
    ExamIntegrityStateOut,
    ExamOrderOut,
    ExamPrecheckIn,
    ExamPrecheckOut,
    ExamSessionOut,
    MembershipCertificateOut,
    QuizAnswerReview,
    QuizAttemptOut,
    QuizQuestionStudentOut,
    QuizSubmitIn,
    UserDocumentOut,
)
from app.services.membership import (
    activate_membership,
    issue_membership_certificate,
    membership_certificate_copy,
    membership_is_expired,
    record_membership_application,
)
from app.services.settings import get_setting

from app.services.assignments import (
    append_attempt,
    assignment_blocks_for_courses,
    assignment_unlock_map,
    can_resubmit,
    can_submit_new,
    can_withdraw,
    clear_grade,
    due_has_passed,
    grade_is_visible,
    latest_submitted_at,
    status_bucket,
    submission_is_late,
    submission_map,
)
from app.services.commerce import (
    ACTIVE_ENROLLMENT,
    apply_profile_fields,
    normalize_membership_type,
    require_active_enrollment,
)

from app.routers.courses.router import router
from app.routers.courses.support import *  # noqa: F403

@router.get("/me/certificates", response_model=list[CertificateOut])
def list_my_certificates(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[CertificateOut]:
    rows = (
        db.query(Certificate)
        .options(joinedload(Certificate.course).joinedload(Course.certificate_template))
        .filter(Certificate.user_id == current_user.id)
        .order_by(Certificate.issued_at.desc())
        .all()
    )
    return [_certificate_to_out(row, current_user.full_name, db) for row in rows]


@router.get("/me/membership-certificate", response_model=MembershipCertificateOut)
def get_my_membership_certificate(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipCertificateOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership certificate not found")
    from app.services.membership import is_student_membership, membership_is_accessible

    if not is_student_membership(current_user.membership_type) and not membership_is_accessible(
        db, current_user
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Complete payment to unlock your membership certificate.",
        )
    row = issue_membership_certificate(db, current_user)
    db.commit()
    db.refresh(row)
    return _membership_to_out(row, current_user.full_name, db)


@router.get("/me/certificates/{certificate_code}", response_model=CertificateOut)
def get_certificate(
    certificate_code: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CertificateOut:
    row = (
        db.query(Certificate)
        .options(joinedload(Certificate.course).joinedload(Course.certificate_template))
        .filter(Certificate.certificate_code == certificate_code, Certificate.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    return _certificate_to_out(row, current_user.full_name, db)


@router.get("/certificates/verify/{certificate_code}", response_model=CertificateVerifyOut)
@limiter.limit("60/minute")
def verify_certificate(
    request: Request,
    certificate_code: str,
    db: Session = Depends(get_db),
) -> CertificateVerifyOut:
    issued_by = get_setting(db, "institute_name") or "CAISBE"
    row = (
        db.query(Certificate)
        .options(
            joinedload(Certificate.course).joinedload(Course.certificate_template),
            joinedload(Certificate.user),
        )
        .filter(Certificate.certificate_code == certificate_code)
        .first()
    )
    if row is not None:
        enrollment = (
            db.query(Enrollment)
            .filter(Enrollment.user_id == row.user_id, Enrollment.course_id == row.course_id)
            .first()
        )
        valid = enrollment is not None and enrollment.status == "completed"
        return CertificateVerifyOut(
            valid=valid,
            kind="completion",
            certificate_code=row.certificate_code,
            student_name=row.user.full_name,
            course_title=certificate_program_name(row.course),
            membership_number=None,
            issued_at=row.issued_at,
            issued_by=issued_by,
            verify_url=_certificate_verify_url(row.certificate_code),
        )

    membership = (
        db.query(MembershipCertificate)
        .options(joinedload(MembershipCertificate.user))
        .filter(MembershipCertificate.certificate_code == certificate_code)
        .first()
    )
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Certificate not found")

    from app.services.membership import is_student_membership, membership_is_accessible

    user = membership.user
    accessible = membership_is_accessible(db, user)
    if not is_student_membership(membership.membership_type):
        type_matches = (user.membership_type or "") == (membership.membership_type or "")
        valid = accessible and type_matches and not membership_is_expired(membership)
    else:
        valid = accessible and not membership_is_expired(membership)

    return CertificateVerifyOut(
        valid=valid,
        kind="membership",
        certificate_code=membership.certificate_code,
        student_name=membership.user.full_name,
        course_title=None,
        membership_number=membership.membership_number,
        issued_at=membership.issued_at,
        expires_at=membership.expires_at,
        issued_by=issued_by,
        verify_url=_certificate_verify_url(membership.certificate_code),
    )
