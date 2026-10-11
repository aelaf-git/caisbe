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

@router.get("/testimonials", response_model=list[TestimonialOut])
def admin_list_testimonials(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[TestimonialOut]:
    rows = (
        db.query(Testimonial)
        .order_by(Testimonial.sort_order.asc(), Testimonial.id.asc())
        .all()
    )
    return [TestimonialOut.model_validate(row) for row in rows]


@router.post("/testimonials", response_model=TestimonialOut, status_code=status.HTTP_201_CREATED)
def admin_create_testimonial(
    payload: TestimonialCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestimonialOut:
    row = Testimonial(
        quote=payload.quote.strip(),
        name=payload.name.strip(),
        role=payload.role.strip(),
        published=payload.published,
        sort_order=payload.sort_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return TestimonialOut.model_validate(row)


@router.patch("/testimonials/{testimonial_id}", response_model=TestimonialOut)
def admin_update_testimonial(
    testimonial_id: int,
    payload: TestimonialUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> TestimonialOut:
    row = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testimonial not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
            if not value:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Quote, name, and role are required.",
                )
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return TestimonialOut.model_validate(row)


@router.delete("/testimonials/{testimonial_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_testimonial(
    testimonial_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(Testimonial).filter(Testimonial.id == testimonial_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Testimonial not found")
    db.delete(row)
    db.commit()


