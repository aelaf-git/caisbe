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


TOPIC_BLOCK_TYPES = {"text", "video", "pdf", "document", "image", "epub", "subtopic", "link"}
TOPIC_SECTION_TYPES = {"text", "subtopic"}
TOPIC_MEDIA_TYPES = {"video", "pdf", "document", "image", "epub", "link"}
CHAPTER_BLOCK_TYPES = {"quiz", "assignment", "reading"}
CHAPTER_UPLOAD_TYPES = TOPIC_MEDIA_TYPES
CHAPTER_ALLOWED_BLOCK_TYPES = CHAPTER_BLOCK_TYPES | CHAPTER_UPLOAD_TYPES

ALLOWED_UPLOAD_EXTENSIONS = {
    ".mp4",
    ".webm",
    ".mov",
    ".m4v",
    ".mp3",
    ".m4a",
    ".wav",
    ".ogg",
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".pdf",
    ".epub",
    ".doc",
    ".docx",
}

# Price is live on the course row. It is not staged in draft_meta, so a later
# save-changes cannot put an older editor price back over the fees page.
COURSE_DRAFT_META_KEYS = ("code", "title", "description", "slug", "cover_url", "pass_percent")


def _live_course_meta(course: Course) -> dict:
    return {
        "code": course.code,
        "title": course.title,
        "description": course.description,
        "slug": course.slug,
        "cover_url": course.cover_url,
        "pass_percent": course.pass_percent,
        "price_cents": course.price_cents,
    }


def _apply_course_draft_meta(course: Course) -> None:
    if not course.draft_meta:
        course.has_unpublished_changes = False
        course.draft_meta = None
        return
    for key, value in course.draft_meta.items():
        if key in COURSE_DRAFT_META_KEYS:
            setattr(course, key, value)
    course.draft_meta = None
    course.has_unpublished_changes = False


def _write_course_meta(course: Course, meta: dict) -> None:
    """Write details into draft when published; otherwise update live columns."""
    if not meta:
        return
    if course.status == "published":
        draft = dict(course.draft_meta or _live_course_meta(course))
        draft.update(meta)
        course.draft_meta = draft
        course.has_unpublished_changes = True
        flag_modified(course, "draft_meta")
        return
    for key, value in meta.items():
        setattr(course, key, value)
    # Draft courses are the working copy — no separate unpublished buffer.
    course.draft_meta = None
    course.has_unpublished_changes = False



def _reading_display_name(url: str) -> str:
    path = unquote(url.split("?")[0].rstrip("/"))
    name = path.split("/")[-1].strip()
    if name:
        stem = name.rsplit(".", 1)[0].strip() if "." in name else name
        cleaned = (stem or name).replace("-", " ").replace("_", " ").strip()
        if cleaned:
            return cleaned
    host = urlparse(url.strip()).netloc.removeprefix("www.")
    return host or "Reading"


def _validate_reading_url(url: str | None) -> None:
    if not url or not url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Add a link or an uploaded document.",
        )
    raw = url.strip()
    lowered = raw.split("?")[0].lower()
    from app.services.storage import is_managed_upload_url

    if is_managed_upload_url(raw) and lowered.endswith((".pdf", ".doc", ".docx", ".epub")):
        return
    parsed = urlparse(raw)
    if parsed.scheme in {"http", "https"} and parsed.netloc:
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="A reading must be either a link or an uploaded PDF, Word, or EPUB file.",
    )


def _validate_assignment(url: str | None, body: str | None) -> None:
    has_body = bool(body and body.strip())
    has_url = bool(url and url.strip())
    if has_url:
        path = url.split("?")[0].lower()
        if not path.endswith((".pdf", ".doc", ".docx")):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Assignments must be a PDF or Word (.doc, .docx) file.",
            )
        return
    if has_body:
        return
    raise HTTPException(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="Add an uploaded document or written instructions.",
    )


def _validate_upload_url(url: str | None, *, field: str = "file") -> None:
    from app.services.storage import is_managed_upload_url

    if not url or not url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field} URL is required.",
        )
    path = url.split("?")[0].lower()
    if not any(path.endswith(ext) for ext in ALLOWED_UPLOAD_EXTENSIONS):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must point to an uploaded file from the media library.",
        )
    if not is_managed_upload_url(url) and not path.startswith(("http://", "https://")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="URL must point to an uploaded file from the media library.",
        )


def _normalize_media_fields(
    *,
    category: str,
    title: str,
    description: str | None,
    file_url: str | None,
    cover_url: str | None,
    external_url: str | None,
    body: str | None,
) -> dict:
    from app.services.media_channels import (
        CHANNEL_CATEGORIES,
        FILE_CATEGORIES,
        extract_youtube_id,
        is_http_url,
        is_podcast_external_url,
        youtube_thumbnail_url,
    )
    from app.services.storage import is_managed_upload_url

    cat = (category or "magazine").strip().lower() or "magazine"
    if cat not in CHANNEL_CATEGORIES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid media category.",
        )
    clean_title = title.strip()
    if not clean_title:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required.")
    clean_description = strip_plain_text(description) if description else None
    clean_file = (file_url or "").strip() or None
    clean_cover = (cover_url or "").strip() or None
    clean_external = (external_url or "").strip() or None
    clean_body = strip_plain_text(body) if body else None

    if cat in FILE_CATEGORIES:
        if not clean_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File URL is required for this media type.",
            )
        _validate_upload_url(clean_file, field="File")
        if clean_cover:
            _validate_upload_url(clean_cover, field="Cover")
        return {
            "title": clean_title,
            "description": clean_description,
            "file_url": clean_file,
            "cover_url": clean_cover,
            "external_url": None,
            "body": None,
            "category": cat,
        }

    if cat == "youtube":
        video_id = extract_youtube_id(clean_external or "")
        if not video_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Enter a valid YouTube URL.",
            )
        if clean_cover:
            if clean_cover.startswith("https://img.youtube.com/"):
                pass
            else:
                _validate_upload_url(clean_cover, field="Cover")
        else:
            clean_cover = youtube_thumbnail_url(video_id)
        return {
            "title": clean_title,
            "description": clean_description,
            "file_url": None,
            "cover_url": clean_cover,
            "external_url": clean_external,
            "body": None,
            "category": cat,
        }

    if cat == "podcast":
        if not clean_external and not clean_file:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Add a podcast episode URL or upload an audio file.",
            )
        if clean_external:
            if not (
                is_podcast_external_url(clean_external)
                or is_managed_upload_url(clean_external)
                or is_http_url(clean_external)
            ):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Enter a valid podcast episode URL.",
                )
            # Prefer external link; uploaded audio can sit in file_url instead.
            if is_managed_upload_url(clean_external) and not clean_file:
                clean_file = clean_external
                # keep external_url for listen CTA when it's a public http link
                if not is_http_url(clean_external):
                    clean_external = clean_external
        if clean_file:
            _validate_upload_url(clean_file, field="Audio file")
        if clean_cover:
            _validate_upload_url(clean_cover, field="Cover")
        listen_url = clean_external or clean_file
        return {
            "title": clean_title,
            "description": clean_description,
            "file_url": clean_file,
            "cover_url": clean_cover,
            "external_url": listen_url,
            "body": None,
            "category": cat,
        }

    # blog
    if not clean_body or len(clean_body.strip()) < 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Blog body is required.",
        )
    if clean_cover:
        _validate_upload_url(clean_cover, field="Cover")
    return {
        "title": clean_title,
        "description": clean_description,
        "file_url": None,
        "cover_url": clean_cover,
        "external_url": None,
        "body": clean_body,
        "category": "blog",
    }


def _block_has_content(block: ContentBlock, children_by_parent: dict[int, list[ContentBlock]]) -> bool:
    if block.block_type == "text":
        if (block.body or "").strip() or (block.title or "").strip():
            return True
    elif block.block_type == "subtopic":
        if (block.title or "").strip() or (block.body or "").strip():
            return True
    for child in children_by_parent.get(block.id, []):
        if child.block_type in TOPIC_MEDIA_TYPES and (child.url or "").strip():
            return True
        if child.block_type in TOPIC_SECTION_TYPES and _block_has_content(child, children_by_parent):
            return True
    return False


def _chapter_has_required_content(chapter: Chapter) -> bool:
    """Content is required: at least one topic with a text/subtopic section (or nested media)."""
    if not chapter.lessons:
        return False
    for lesson in chapter.lessons:
        if (lesson.body or "").strip():
            return True
        children_by_parent: dict[int, list[ContentBlock]] = {}
        top_level: list[ContentBlock] = []
        for block in lesson.blocks:
            if block.parent_id is None:
                top_level.append(block)
            else:
                children_by_parent.setdefault(block.parent_id, []).append(block)
        for block in top_level:
            if block.block_type in TOPIC_SECTION_TYPES and _block_has_content(block, children_by_parent):
                return True
    return False


def _parent_chain_contains(
    db: Session,
    *,
    start_id: int,
    needle_id: int,
    lesson_id: int,
) -> bool:
    current_id: int | None = start_id
    seen: set[int] = set()
    while current_id is not None:
        if current_id == needle_id:
            return True
        if current_id in seen:
            return True
        seen.add(current_id)
        row = (
            db.query(ContentBlock.parent_id)
            .filter(ContentBlock.id == current_id, ContentBlock.lesson_id == lesson_id)
            .first()
        )
        current_id = row[0] if row else None
    return False


def _validate_topic_parent(
    db: Session,
    *,
    lesson_id: int,
    parent_id: int | None,
    block_type: str,
    block_id: int | None = None,
) -> int | None:
    if parent_id is None:
        if block_type in TOPIC_MEDIA_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploads must be attached to a text or subtopic block",
            )
        return None

    if block_id is not None and parent_id == block_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A block cannot be nested under itself",
        )

    parent = (
        db.query(ContentBlock)
        .filter(ContentBlock.id == parent_id, ContentBlock.lesson_id == lesson_id)
        .first()
    )
    if parent is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Parent block was not found in this topic",
        )

    if block_id is not None and _parent_chain_contains(
        db, start_id=parent_id, needle_id=block_id, lesson_id=lesson_id
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot nest a block under its own descendant",
        )

    if block_type in TOPIC_SECTION_TYPES:
        if parent.block_type != "subtopic":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notes and subtopics can only nest under a subtopic",
            )
        return parent_id

    if block_type in TOPIC_MEDIA_TYPES:
        if parent.block_type not in TOPIC_SECTION_TYPES:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Upload parent must be a text or subtopic block in this topic",
            )
        return parent_id

    return parent_id


def _delete_block_tree(db: Session, root: ContentBlock) -> None:
    quiz_ids: list[int] = []
    descendant_ids: list[int] = []
    frontier = [root.id]
    if root.quiz_id:
        quiz_ids.append(root.quiz_id)
    while frontier:
        children = db.query(ContentBlock).filter(ContentBlock.parent_id.in_(frontier)).all()
        frontier = []
        for child in children:
            descendant_ids.append(child.id)
            frontier.append(child.id)
            if child.quiz_id:
                quiz_ids.append(child.quiz_id)
    for child_id in reversed(descendant_ids):
        db.query(ContentBlock).filter(ContentBlock.id == child_id).delete(synchronize_session=False)
    db.delete(root)
    for quiz_id in quiz_ids:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if quiz:
            db.delete(quiz)


def _publish_content_errors(course: Course) -> list[str]:
    if not course.chapters:
        return ["Add at least one chapter with Content before publishing."]
    errors: list[str] = []
    for chapter in course.chapters:
        if not _chapter_has_required_content(chapter):
            errors.append(f"{chapter.title} needs Content (at least one topic with text or media) before publishing.")
    exam = course.final_exam
    if exam is not None and exam.questions_to_appear is not None:
        bank = len(exam.questions or [])
        if bank < exam.questions_to_appear:
            errors.append(
                f"Final exam needs at least {exam.questions_to_appear} questions in the bank "
                f"(currently {bank}) before publishing."
            )
    return errors



def _replace_questions(
    db: Session,
    questions_in: list,
    *,
    quiz_id: int | None = None,
    final_exam_id: int | None = None,
) -> None:
    if quiz_id is not None:
        db.query(QuizQuestion).filter(QuizQuestion.quiz_id == quiz_id).delete()
    if final_exam_id is not None:
        db.query(QuizQuestion).filter(QuizQuestion.final_exam_id == final_exam_id).delete()
    db.flush()

    for q_idx, q_in in enumerate(questions_in):
        question = QuizQuestion(
            quiz_id=quiz_id,
            final_exam_id=final_exam_id,
            prompt=strip_plain_text(q_in.prompt) or "",
            sort_order=q_in.sort_order if q_in.sort_order else q_idx,
        )
        db.add(question)
        db.flush()
        for c_idx, c_in in enumerate(q_in.choices or []):
            db.add(
                QuizChoice(
                    question_id=question.id,
                    text=strip_plain_text(c_in.text) or "",
                    is_correct=bool(c_in.is_correct),
                    sort_order=c_in.sort_order if c_in.sort_order else c_idx,
                )
            )
        if not q_in.choices:
            for c_idx in range(2):
                db.add(
                    QuizChoice(
                        question_id=question.id,
                        text="",
                        is_correct=c_idx == 0,
                        sort_order=c_idx,
                    )
                )


def _apply_plain_text_fields(data: dict, *keys: str) -> None:
    for key in keys:
        if key in data and isinstance(data[key], str):
            data[key] = strip_plain_text(data[key]) or ""


def _load_course_admin(db: Session, course_id: int) -> Course:
    course = (
        db.query(Course)
        .options(
            joinedload(Course.chapters)
            .joinedload(Chapter.lessons)
            .joinedload(Lesson.blocks)
            .joinedload(ContentBlock.quiz)
            .joinedload(Quiz.questions)
            .joinedload(QuizQuestion.choices),
            joinedload(Course.chapters)
            .joinedload(Chapter.blocks)
            .joinedload(ContentBlock.quiz)
            .joinedload(Quiz.questions)
            .joinedload(QuizQuestion.choices),
            joinedload(Course.final_exam).joinedload(FinalExam.questions).joinedload(QuizQuestion.choices),
            joinedload(Course.certificate_template),
        )
        .filter(Course.id == course_id)
        .first()
    )
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


def _course_admin_out(course: Course) -> CourseDetailAdminOut:
    out = CourseDetailAdminOut.model_validate(course)
    out.has_unpublished_changes = bool(course.has_unpublished_changes)
    if course.has_unpublished_changes and course.draft_meta:
        for key in COURSE_DRAFT_META_KEYS:
            if key in course.draft_meta:
                setattr(out, key, course.draft_meta[key])
    return out


# --- Dashboard & site activity ---


def _choice(data: dict[str, str], key: str, allowed: set[str], default: str) -> str:
    value = data.get(key, default)
    return value if value in allowed else default


def _settings_out(db: Session) -> AppSettingsOut:
    data = get_settings_map(db)
    return AppSettingsOut(
        institute_name=data.get("institute_name", "CAISBE"),
        default_pass_percent=default_pass_percent(db),
        membership_cert_title=data.get("membership_cert_title", "Certificate of Membership"),
        completion_cert_title=data.get("completion_cert_title", "Certificate of Completion"),
        portal_public_url=settings.portal_public_url,
        ui_theme=_choice(data, "ui_theme", {"light", "dark"}, "light"),
        ui_font_size=_choice(data, "ui_font_size", {"sm", "md", "lg", "xl"}, "md"),
        ui_font_body=_choice(
            data,
            "ui_font_body",
            {
                "nunito",
                "poppins",
                "roboto",
                "open-sans",
                "inter",
                "source-sans",
                "merriweather",
                "source-serif",
            },
            "nunito",
        ),
        ui_font_display=_choice(
            data,
            "ui_font_display",
            {
                "nunito",
                "poppins",
                "roboto",
                "open-sans",
                "inter",
                "source-sans",
                "merriweather",
                "source-serif",
            },
            "poppins",
        ),
        hero_transition_ms=hero_transition_ms(db),
    )


def _enrollment_completed(enrollment: Enrollment) -> bool:
    return enrollment.status == "completed" or enrollment.progress >= 100


def _enrollment_in_progress(enrollment: Enrollment) -> bool:
    return not _enrollment_completed(enrollment) and 1 <= enrollment.progress <= 99


def _enrollment_not_started(enrollment: Enrollment) -> bool:
    return not _enrollment_completed(enrollment) and enrollment.progress == 0


MAX_UPLOAD_BYTES = 500 * 1024 * 1024


def _payment_out(row: Payment) -> PaymentOut:
    order = row.order
    items = list(order.items) if order and order.items else []
    if not items:
        course_title = ""
    elif len(items) == 1:
        course_title = items[0].title
    else:
        course_title = f"{items[0].title} +{len(items) - 1} more"
    invoice = row.invoice
    if invoice is None and order is not None and order.invoices:
        invoice = order.invoices[0]
    user = row.user
    return PaymentOut(
        id=row.id,
        status=row.status,
        provider=row.provider,
        amount_cents=row.amount_cents,
        created_at=row.created_at,
        order_number=order.number if order else "",
        student_name=user.full_name if user else "",
        student_email=user.email if user else "",
        course_title=course_title,
        currency=(order.currency if order and order.currency else "usd"),
        invoice_number=invoice.number if invoice else None,
        items=[
            OrderItemOut(
                course_id=item.course_id,
                membership_type=item.membership_type,
                title=item.title,
                unit_price_cents=item.unit_price_cents,
                quantity=item.quantity or 1,
            )
            for item in items
        ],
        receipt_printed_at=row.receipt_printed_at,
        reviewed_at=row.reviewed_at,
    )


def _promotion_kind(value: str | None) -> str:
    kind = (value or "discount").strip().lower()
    if kind not in {"discount", "scholarship"}:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Kind must be discount or scholarship.")
    return kind


def _assignment_submission_out(row: AssignmentSubmission) -> AssignmentSubmissionOut:
    from app.services.assignments import latest_submitted_at, submission_is_late

    block = row.block
    chapter = block.chapter if block else None
    course = chapter.course if chapter else None
    student = row.user
    submitted_at = latest_submitted_at(row)
    return AssignmentSubmissionOut(
        id=row.id,
        content_block_id=row.content_block_id,
        assignment_title=(block.title if block and block.title else "Assignment"),
        course_code=course.code if course else "",
        course_title=course.title if course else "",
        body=row.body,
        file_url=row.file_url,
        file_name=row.file_name,
        status=row.status,
        score=row.score,
        feedback=row.feedback,
        points_possible=block.points_possible if block else None,
        due_at=block.due_at if block else None,
        is_late=submission_is_late(block.due_at if block else None, submitted_at),
        graded_at=row.graded_at,
        user_id=row.user_id,
        student_name=student.full_name if student else None,
        student_email=student.email if student else None,
        submitted_at=submitted_at,
    )


def _assignment_submission_query(db: Session):
    return db.query(AssignmentSubmission).options(
        joinedload(AssignmentSubmission.user),
        selectinload(AssignmentSubmission.attempts),
        joinedload(AssignmentSubmission.block).joinedload(ContentBlock.chapter).joinedload(Chapter.course),
    )


def _job_out(row: JobPosting, *, now: datetime | None = None) -> JobPostingOut:
    current = now or datetime.now(timezone.utc)
    expires = row.expires_on
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    payload = JobPostingOut.model_validate(row)
    payload.is_expired = expires < current
    return payload


def _unique_news_slug(db: Session, base: str, *, exclude_id: int | None = None) -> str:
    candidate = slugify_title(base)
    suffix = 2
    while True:
        query = db.query(NewsPost).filter(NewsPost.slug == candidate)
        if exclude_id is not None:
            query = query.filter(NewsPost.id != exclude_id)
        if query.first() is None:
            return candidate
        candidate = f"{slugify_title(base)[:220]}-{suffix}"
        suffix += 1


def _news_out(row: NewsPost) -> NewsPostOut:
    return NewsPostOut.model_validate(row)


def _normalize_url_list(urls: list[str] | None) -> list[str]:
    if not urls:
        return []
    cleaned: list[str] = []
    for url in urls:
        value = (url or "").strip()
        if value:
            cleaned.append(value)
    return cleaned



__all__ = [name for name in globals() if not name.startswith('__')]
