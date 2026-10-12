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

@router.get("/me/notifications")
def list_my_notifications(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    from app.schemas.notifications import NotificationListOut, NotificationOut
    from app.services.notifications import (
        ensure_membership_expiry_reminders,
        list_user_notifications,
        notification_link_for_client,
        unread_notification_count,
    )

    created = ensure_membership_expiry_reminders(db, current_user)
    if created:
        db.commit()
    items = list_user_notifications(db, current_user)
    payload = NotificationListOut(
        unread_count=unread_notification_count(db, current_user),
        items=[NotificationOut.model_validate(row) for row in items],
    )
    for item in payload.items:
        item.link = notification_link_for_client(item.link)
    return payload.model_dump()


@router.post("/me/notifications/{notification_id}/read")
def mark_my_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict:
    from app.schemas.notifications import NotificationOut
    from app.services.notifications import mark_notification_read, notification_link_for_client

    row = mark_notification_read(db, current_user, notification_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    db.commit()
    payload = NotificationOut.model_validate(row)
    payload.link = notification_link_for_client(payload.link)
    return payload.model_dump()


@router.post("/me/notifications/read-all")
def mark_all_my_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> dict[str, int]:
    from app.services.notifications import mark_all_notifications_read

    count = mark_all_notifications_read(db, current_user)
    db.commit()
    return {"marked": count}


