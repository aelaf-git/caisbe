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

@router.post("/uploads", response_model=UploadOut)
async def admin_upload(
    request: Request,
    _: User = Depends(require_admin),
) -> UploadOut:
    from app.services.storage import save_upload

    form = await request.form(max_part_size=MAX_UPLOAD_BYTES)
    uploaded = form.get("file")
    if not isinstance(uploaded, UploadFile):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing file upload",
        )
    folder = str(form.get("folder") or "general")
    url, display_name = await save_upload(
        uploaded,
        allowed_suffixes=ALLOWED_UPLOAD_EXTENSIONS,
        max_bytes=MAX_UPLOAD_BYTES,
        folder=folder,
        invalid_detail="File type not allowed. Use videos, audio, images, PDF, EPUB, or Word.",
        too_large_detail="File is too large. Maximum upload size is 500 MB.",
    )
    return UploadOut(url=url, filename=display_name)


# --- Media library ---


@router.get("/media", response_model=list[MediaAssetOut])
def admin_list_media(
    category: str | None = Query(default=None, max_length=32),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[MediaAssetOut]:
    category_key = category.strip().lower() if category else None
    if category_key == "hero":
        ensure_default_hero_slides(db)
        db.commit()
    query = db.query(MediaAsset)
    if category_key:
        query = query.filter(MediaAsset.category == category_key)
    rows = query.order_by(MediaAsset.sort_order.asc(), MediaAsset.created_at.desc()).all()
    return [MediaAssetOut.model_validate(row) for row in rows]


@router.post("/media", response_model=MediaAssetOut, status_code=status.HTTP_201_CREATED)
def admin_create_media(
    payload: MediaAssetCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MediaAssetOut:
    from app.services.media_channels import media_public_path

    fields = _normalize_media_fields(
        category=payload.category,
        title=payload.title,
        description=payload.description,
        file_url=payload.file_url,
        cover_url=payload.cover_url,
        external_url=payload.external_url,
        body=payload.body,
    )
    asset = MediaAsset(
        title=fields["title"],
        description=fields["description"],
        file_url=fields["file_url"],
        cover_url=fields["cover_url"],
        external_url=fields["external_url"],
        body=fields["body"],
        category=fields["category"],
        published=payload.published,
        featured=payload.featured,
        sort_order=payload.sort_order,
    )
    db.add(asset)
    db.flush()
    if asset.published:
        from app.services.notifications import notify_students_publication

        notify_students_publication(
            db,
            title="New media published",
            body=f'"{asset.title}" is now available in CAISBE media resources.',
            kind="media",
            path=media_public_path(asset.category),
        )
    db.commit()
    db.refresh(asset)
    return MediaAssetOut.model_validate(asset)


@router.patch("/media/{asset_id}", response_model=MediaAssetOut)
def admin_update_media(
    asset_id: int,
    payload: MediaAssetUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> MediaAssetOut:
    from app.services.media_channels import media_public_path

    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found")

    was_published = bool(asset.published)
    data = payload.model_dump(exclude_unset=True)
    fields = _normalize_media_fields(
        category=data.get("category", asset.category),
        title=data.get("title", asset.title),
        description=data["description"] if "description" in data else asset.description,
        file_url=data["file_url"] if "file_url" in data else asset.file_url,
        cover_url=data["cover_url"] if "cover_url" in data else asset.cover_url,
        external_url=data["external_url"] if "external_url" in data else asset.external_url,
        body=data["body"] if "body" in data else asset.body,
    )
    asset.title = fields["title"]
    asset.description = fields["description"]
    asset.file_url = fields["file_url"]
    asset.cover_url = fields["cover_url"]
    asset.external_url = fields["external_url"]
    asset.body = fields["body"]
    asset.category = fields["category"]
    if "published" in data:
        asset.published = bool(data["published"])
    if "featured" in data:
        asset.featured = bool(data["featured"])
    if "sort_order" in data and data["sort_order"] is not None:
        asset.sort_order = int(data["sort_order"])

    if asset.published and not was_published:
        from app.services.notifications import notify_students_publication

        notify_students_publication(
            db,
            title="New media published",
            body=f'"{asset.title}" is now available in CAISBE media resources.',
            kind="media",
            path=media_public_path(asset.category),
        )
    db.commit()
    db.refresh(asset)
    return MediaAssetOut.model_validate(asset)


@router.delete("/media/{asset_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_media(
    asset_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found")
    db.delete(asset)
    db.commit()


# --- Newsletter ---


@router.get("/newsletter/subscribers", response_model=list[NewsletterSubscriberOut])
def admin_list_newsletter_subscribers(
    active_only: bool = Query(default=True),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[NewsletterSubscriberOut]:
    query = db.query(NewsletterSubscriber)
    if active_only:
        query = query.filter(NewsletterSubscriber.unsubscribed_at.is_(None))
    rows = query.order_by(NewsletterSubscriber.subscribed_at.desc()).all()
    return [NewsletterSubscriberOut.model_validate(row) for row in rows]


@router.delete("/newsletter/subscribers/{subscriber_id}")
def admin_delete_newsletter_subscriber(
    subscriber_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> dict[str, str]:
    row = db.query(NewsletterSubscriber).filter(NewsletterSubscriber.id == subscriber_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Subscriber not found")
    email = row.email
    try:
        db.delete(row)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Unable to remove subscriber. Please try again.",
        ) from exc
    return {"message": f"Removed {email}."}


@router.get("/newsletter/campaigns", response_model=list[NewsletterCampaignOut])
def admin_list_newsletter_campaigns(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[NewsletterCampaignOut]:
    rows = (
        db.query(NewsletterCampaign)
        .order_by(NewsletterCampaign.sent_at.desc())
        .limit(50)
        .all()
    )
    return [NewsletterCampaignOut.model_validate(row) for row in rows]


@router.get("/notifications/broadcasts", response_model=list[AdminNotificationBroadcastOut])
def admin_list_notification_broadcasts(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminNotificationBroadcastOut]:
    rows = (
        db.query(NotificationBroadcast)
        .order_by(NotificationBroadcast.id.desc())
        .limit(100)
        .all()
    )
    return [
        AdminNotificationBroadcastOut(
            id=row.id,
            title=row.title,
            body=row.body,
            kind=row.kind,
            link=row.link,
            audience=row.audience,
            recipient_count=row.recipient_count,
            created_at=row.created_at,
            sent_by_name=row.sent_by.full_name if row.sent_by else None,
        )
        for row in rows
    ]


@router.post("/notifications/send", response_model=AdminNotificationSendOut)
def admin_send_notification_broadcast(
    payload: AdminNotificationSendIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminNotificationSendOut:
    title = payload.title.strip()
    body = strip_plain_text(payload.body) or ""
    if not title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required.")
    if not body.strip():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Message body is required.")

    from app.services.notifications import broadcast_to_students

    link = (payload.link or "").strip() or None
    broadcast = broadcast_to_students(
        db,
        title=title,
        body=body,
        kind=payload.kind,
        link=link,
        audience=payload.audience,
        sent_by_id=admin.id,
    )
    db.commit()
    db.refresh(broadcast)
    return AdminNotificationSendOut(
        broadcast_id=broadcast.id,
        recipient_count=broadcast.recipient_count,
        message=f"Notification sent to {broadcast.recipient_count} registered member(s).",
    )


@router.post("/newsletter/send", response_model=NewsletterSendOut)
def admin_send_newsletter(
    payload: NewsletterSendIn,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> NewsletterSendOut:
    subject = payload.subject.strip()
    body_html = sanitize_html(payload.body_html) or ""
    if not body_html.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Newsletter body cannot be empty.",
        )

    unique_ids = list(dict.fromkeys(payload.subscriber_ids))
    subscribers = (
        db.query(NewsletterSubscriber)
        .filter(
            NewsletterSubscriber.id.in_(unique_ids),
            NewsletterSubscriber.unsubscribed_at.is_(None),
        )
        .order_by(NewsletterSubscriber.id.asc())
        .all()
    )
    if not subscribers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Select at least one active subscriber to send to.",
        )

    attachments = []
    try:
        for item in payload.attachments:
            _validate_upload_url(item.file_url, field="Attachment")
            attachments.append(load_upload_attachment(item.file_url, item.filename))
    except EmailDeliveryError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    from app.services.email_layout import wrap_email_html
    from app.services.newsletter_unsubscribe import unsubscribe_footer_html

    failed: list[str] = []
    sent_count = 0
    for row in subscribers:
        try:
            recipient_html = wrap_email_html(
                body_html,
                heading=subject,
                eyebrow="CAISBE Newsletter",
                include_signoff=False,
                footer_extra_html=unsubscribe_footer_html(
                    subscriber_id=row.id,
                    email=row.email,
                ),
            )
            send_email(
                to=row.email,
                subject=subject,
                html_body=recipient_html,
                purpose="newsletter",
                attachments=attachments,
            )
            sent_count += 1
        except EmailDeliveryError:
            failed.append(row.email)

    if sent_count == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to deliver newsletter to any recipient. Check Resend settings.",
        )

    campaign = NewsletterCampaign(
        subject=subject,
        body_html=body_html,
        recipient_count=sent_count,
        sent_by_id=admin.id,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    message = f"Newsletter sent to {sent_count} recipient(s)."
    if failed:
        message += f" Failed for {len(failed)} address(es)."

    return NewsletterSendOut(
        campaign_id=campaign.id,
        recipient_count=sent_count,
        message=message,
    )


