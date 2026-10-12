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

@router.post("/me/membership/apply", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_my_membership(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot apply for membership.")

    content_type = (request.headers.get("content-type") or "").lower()
    supporting_note: str | None = None
    if "multipart/form-data" in content_type:
        form = await request.form(max_part_size=20 * 1024 * 1024)
        payload = MembershipApplicationIn(
            full_name=str(form.get("full_name") or ""),
            email=str(form.get("email") or current_user.email),
            phone=str(form.get("phone") or ""),
            country=str(form.get("country") or ""),
            city=str(form.get("city") or ""),
            address=(str(form.get("address") or "").strip() or None),
            organization=(str(form.get("organization") or "").strip() or None),
            job_title=(str(form.get("job_title") or "").strip() or None),
            membership_type=str(form.get("membership_type") or "student"),
            details=(str(form.get("details") or "").strip() or None),
            kind=(str(form.get("kind") or "").strip() or None),
        )
        uploaded = form.get("supporting_document")
        if isinstance(uploaded, UploadFile) and (uploaded.filename or "").strip():
            label = (
                str(form.get("supporting_document_label") or "Supporting document").strip()
                or "Supporting document"
            )
            file_url, original_name = await _save_membership_upload(
                uploaded,
                allowed_suffixes=_MEMBERSHIP_DOC_SUFFIXES,
                folder="membership/supporting",
            )
            supporting_note = f"{label}: {original_name}\nFile: {file_url}"
    else:
        payload = MembershipApplicationIn.model_validate(await request.json())

    membership_type = normalize_membership_type(payload.membership_type) or "student"
    apply_profile_fields(
        current_user,
        {
            "full_name": payload.full_name,
            "phone": payload.phone,
            "country": payload.country,
            "city": payload.city,
            "address": payload.address,
            "organization": payload.organization,
            "job_title": payload.job_title,
        },
    )
    renew = (payload.kind or "").strip().lower() == "renewal"
    details = (payload.details or "").strip() or None
    if supporting_note:
        details = f"{details}\n{supporting_note}".strip() if details else supporting_note
    from app.services.membership import is_student_membership

    if is_student_membership(membership_type):
        activate_membership(db, current_user, membership_type, renew=renew)
        status_value = "active"
    else:
        # Keep current active membership (usually student) until Stripe payment.
        status_value = "pending_payment"
    application = record_membership_application(
        db,
        current_user,
        membership_type=membership_type,
        details=details,
        status_value=status_value,
    )
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


@router.post("/me/membership/supporting-document", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
async def upload_membership_supporting_document(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    """Attach a supporting document to the member's latest membership application."""
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot apply for membership.")
    form = await request.form(max_part_size=20 * 1024 * 1024)
    uploaded = form.get("file") or form.get("supporting_document")
    if not isinstance(uploaded, UploadFile) or not (uploaded.filename or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a supporting document to upload.")
    label = str(form.get("label") or form.get("supporting_document_label") or "Supporting document").strip()
    file_url, original_name = await _save_membership_upload(
        uploaded,
        allowed_suffixes=_MEMBERSHIP_DOC_SUFFIXES,
        folder="membership/supporting",
    )
    application = (
        db.query(MembershipApplication)
        .filter(MembershipApplication.user_id == current_user.id)
        .order_by(MembershipApplication.id.desc())
        .first()
    )
    note = f"{label}: {original_name}\nFile: {file_url}"
    if application is None:
        application = record_membership_application(
            db,
            current_user,
            membership_type=current_user.membership_type or "student",
            details=note,
            status_value=current_user.membership_status or "active",
        )
    else:
        application.details = _append_supporting_document_details(
            application.details,
            label=label,
            original_name=original_name,
            file_url=file_url,
        )
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


@router.post("/me/membership/apply-file", response_model=MembershipApplicationOut, status_code=status.HTTP_201_CREATED)
async def apply_my_membership_file(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> MembershipApplicationOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot apply for membership.")
    form = await request.form(max_part_size=20 * 1024 * 1024)
    uploaded = form.get("file")
    if not isinstance(uploaded, UploadFile):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a completed form to upload.")
    file_url, original_name = await _save_membership_upload(
        uploaded,
        allowed_suffixes=_MEMBERSHIP_FORM_SUFFIXES,
        folder="membership/forms",
        invalid_detail="Upload a PDF or Word file.",
    )

    kind = str(form.get("kind") or "application").strip().lower()
    kind_label = "Renewal" if kind == "renewal" else "New membership"
    details = f"{kind_label}\nUploaded form: {original_name}\nFile: {file_url}"
    membership_type = current_user.membership_type or "student"
    from app.services.membership import is_student_membership

    if is_student_membership(membership_type):
        activate_membership(db, current_user, membership_type, renew=kind == "renewal")
        status_value = "active"
    else:
        status_value = "pending_payment"
    application = record_membership_application(
        db,
        current_user,
        membership_type=membership_type,
        details=details,
        status_value=status_value,
    )
    db.commit()
    db.refresh(application)
    return MembershipApplicationOut.model_validate(application)


@router.get("/me/documents", response_model=list[UserDocumentOut])
def list_my_documents(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[UserDocumentOut]:
    rows = (
        db.query(UserDocument)
        .filter(UserDocument.user_id == current_user.id)
        .order_by(UserDocument.id.desc())
        .all()
    )
    return [UserDocumentOut.model_validate(row) for row in rows]


@router.post("/me/documents", response_model=UserDocumentOut, status_code=status.HTTP_201_CREATED)
async def upload_my_document(
    request: Request,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> UserDocumentOut:
    if current_user.role == "admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admins cannot attach student documents.")
    form = await request.form(max_part_size=20 * 1024 * 1024)
    uploaded = form.get("file") or form.get("supporting_document")
    if not isinstance(uploaded, UploadFile) or not (uploaded.filename or "").strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Choose a supporting document to upload.")
    label = str(form.get("label") or form.get("supporting_document_label") or "Supporting document").strip()
    if not label:
        label = "Supporting document"
    file_url, original_name = await _save_membership_upload(
        uploaded,
        allowed_suffixes=_MEMBERSHIP_DOC_SUFFIXES,
        folder="profile/supporting",
    )
    row = UserDocument(
        user_id=current_user.id,
        label=label[:160],
        file_name=original_name[:255],
        file_url=file_url,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return UserDocumentOut.model_validate(row)


@router.delete("/me/documents/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_my_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    row = (
        db.query(UserDocument)
        .filter(UserDocument.id == document_id, UserDocument.user_id == current_user.id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    db.delete(row)
    db.commit()


