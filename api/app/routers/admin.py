from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import unquote, urlparse

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.orm import Session, joinedload
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
    ContentBlock,
    Course,
    CpdActivity,
    Enrollment,
    FinalExam,
    IndustryEvent,
    JobPosting,
    Lesson,
    MediaAsset,
    MembershipCertificate,
    NewsletterCampaign,
    NewsletterSubscriber,
    QuizAttempt,
    SiteVisit,
    Quiz,
    QuizChoice,
    QuizQuestion,
    User,
    MembershipApplication,
    Order,
    Payment,
    Promotion,
)
from app.schemas.commerce import PaymentOut, PromotionIn, PromotionOut
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
    CpdActivityCreateIn,
    CpdActivityOut,
    CpdActivityUpdateIn,
    IndustryEventCreateIn,
    IndustryEventOut,
    IndustryEventUpdateIn,
)
from app.schemas.jobs import (
    JobPostingCreateIn,
    JobPostingOut,
    JobPostingUpdateIn,
)
from app.services.analytics import display_city, display_country, site_visit_stats
from app.services.email import EmailDeliveryError, load_upload_attachment, send_email
from app.services.settings import default_pass_percent, get_settings_map, set_settings, hero_transition_ms
from app.services.hero import ensure_default_hero_slides

router = APIRouter(prefix="/admin", tags=["admin"])

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

COURSE_DRAFT_META_KEYS = ("code", "title", "description", "slug", "cover_url", "pass_percent", "price_cents")


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
    if "/api/uploads/" in lowered and lowered.endswith((".pdf", ".doc", ".docx", ".epub")):
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


@router.get("/dashboard", response_model=AdminDashboardOut)
def admin_dashboard(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminDashboardOut:
    courses = db.query(Course).all()
    enrollments = db.query(Enrollment).all()
    visit_stats = site_visit_stats(db)
    completed = sum(1 for row in enrollments if row.status == "completed" or row.progress >= 100)
    in_progress = sum(
        1 for row in enrollments if not (row.status == "completed" or row.progress >= 100) and 1 <= row.progress <= 99
    )
    total = len(enrollments)
    return AdminDashboardOut(
        students=db.query(User).filter(User.role == "student").count(),
        courses_total=len(courses),
        courses_published=sum(1 for row in courses if row.status == "published"),
        courses_draft=sum(1 for row in courses if (row.status or "draft") == "draft"),
        total_enrollments=total,
        enrollments_in_progress=in_progress,
        enrollments_completed=completed,
        completion_rate=round(100 * completed / total) if total else 0,
        certificates=db.query(Certificate).count(),
        membership_certificates=db.query(MembershipCertificate).count(),
        newsletter_subscribers=db.query(NewsletterSubscriber)
        .filter(NewsletterSubscriber.unsubscribed_at.is_(None))
        .count(),
        newsletters_sent=db.query(NewsletterCampaign).count(),
        magazines_published=db.query(MediaAsset)
        .filter(MediaAsset.category == "magazine", MediaAsset.published.is_(True))
        .count(),
        site_views_today=visit_stats.views_today,
        site_unique_today=visit_stats.unique_today,
        landing_views=visit_stats.landing_views,
        landing_unique_visitors=visit_stats.landing_unique_visitors,
    )


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
            {"roboto", "open-sans", "inter", "source-sans", "merriweather", "source-serif"},
            "roboto",
        ),
        ui_font_display=_choice(
            data,
            "ui_font_display",
            {"roboto", "open-sans", "inter", "source-sans", "merriweather", "source-serif"},
            "open-sans",
        ),
        hero_transition_ms=hero_transition_ms(db),
    )


@router.get("/settings", response_model=AppSettingsOut)
def admin_get_settings(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AppSettingsOut:
    return _settings_out(db)


@router.put("/settings", response_model=AppSettingsOut)
def admin_update_settings(
    payload: AppSettingsUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AppSettingsOut:
    updates: dict[str, str] = {}
    if payload.institute_name is not None:
        updates["institute_name"] = payload.institute_name.strip()
    if payload.default_pass_percent is not None:
        updates["default_pass_percent"] = str(payload.default_pass_percent)
    if payload.membership_cert_title is not None:
        updates["membership_cert_title"] = payload.membership_cert_title.strip()
    if payload.completion_cert_title is not None:
        updates["completion_cert_title"] = payload.completion_cert_title.strip()
    if payload.ui_theme is not None:
        updates["ui_theme"] = payload.ui_theme
    if payload.ui_font_size is not None:
        updates["ui_font_size"] = payload.ui_font_size
    if payload.ui_font_body is not None:
        updates["ui_font_body"] = payload.ui_font_body
    if payload.ui_font_display is not None:
        updates["ui_font_display"] = payload.ui_font_display
    if payload.hero_transition_ms is not None:
        updates["hero_transition_ms"] = str(payload.hero_transition_ms)
    if updates:
        set_settings(db, updates)
        db.commit()
    return _settings_out(db)


@router.post("/change-password", status_code=status.HTTP_204_NO_CONTENT)
def admin_change_password(
    payload: AdminPasswordChange,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()


@router.get("/reports", response_model=AdminReportsOut)
def admin_reports(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AdminReportsOut:
    enrollments = db.query(Enrollment).all()
    completed = sum(1 for row in enrollments if row.status == "completed" or row.progress >= 100)
    in_progress = sum(
        1 for row in enrollments if not (row.status == "completed" or row.progress >= 100) and 1 <= row.progress <= 99
    )
    total = len(enrollments)
    quiz_attempts = db.query(QuizAttempt).count()
    quiz_passed = db.query(QuizAttempt).filter(QuizAttempt.passed.is_(True)).count()

    courses = db.query(Course).order_by(Course.code.asc()).all()
    course_rows: list[CourseReportRow] = []
    for course in courses:
        course_enrollments = [row for row in enrollments if row.course_id == course.id]
        course_completed = sum(
            1 for row in course_enrollments if row.status == "completed" or row.progress >= 100
        )
        course_total = len(course_enrollments)
        certs = db.query(Certificate).filter(Certificate.course_id == course.id).count()
        course_rows.append(
            CourseReportRow(
                course_id=course.id,
                course_code=course.code,
                course_title=course.title,
                enrollments=course_total,
                completed=course_completed,
                completion_percent=round(100 * course_completed / course_total) if course_total else 0,
                certificates_issued=certs,
            )
        )

    return AdminReportsOut(
        students=db.query(User).filter(User.role == "student").count(),
        total_enrollments=total,
        enrollments_completed=completed,
        enrollments_in_progress=in_progress,
        completion_rate=round(100 * completed / total) if total else 0,
        membership_certificates=db.query(MembershipCertificate).count(),
        completion_certificates=db.query(Certificate).count(),
        quiz_attempts=quiz_attempts,
        quiz_passed=quiz_passed,
        courses=course_rows,
    )


# --- Site visits ---


@router.get("/site-visits/stats", response_model=SiteVisitStatsOut)
def admin_site_visit_stats(
    days: int | None = Query(default=None, ge=1, le=365),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> SiteVisitStatsOut:
    return site_visit_stats(db, days=days)


@router.get("/site-visits", response_model=list[SiteVisitOut])
def admin_list_site_visits(
    path: str | None = Query(default=None, max_length=512),
    landing_only: bool = Query(default=False),
    days: int | None = Query(default=None, ge=1, le=365),
    country: str | None = Query(default=None, max_length=64),
    limit: int = Query(default=200, ge=1, le=1000),
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[SiteVisitOut]:
    query = db.query(SiteVisit)
    if days:
        since = datetime.now(timezone.utc) - timedelta(days=days)
        query = query.filter(SiteVisit.visited_at >= since)
    if landing_only:
        query = query.filter(SiteVisit.path == "/")
    elif path:
        query = query.filter(SiteVisit.path == path)
    rows = query.order_by(SiteVisit.visited_at.desc()).limit(5000).all()
    selected = rows
    if country:
        wanted = country.strip().casefold()
        selected = [
            row
            for row in rows
            if display_country(row.country, row.timezone).casefold() == wanted
        ]
    payload: list[SiteVisitOut] = []
    for row in selected[:limit]:
        item = SiteVisitOut.model_validate(row)
        item.location_country = display_country(row.country, row.timezone)
        item.location_city = display_city(row.city, row.timezone)
        payload.append(item)
    return payload


# --- Students ---


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


def _enrollment_completed(enrollment: Enrollment) -> bool:
    return enrollment.status == "completed" or enrollment.progress >= 100


def _enrollment_in_progress(enrollment: Enrollment) -> bool:
    return not _enrollment_completed(enrollment) and 1 <= enrollment.progress <= 99


def _enrollment_not_started(enrollment: Enrollment) -> bool:
    return not _enrollment_completed(enrollment) and enrollment.progress == 0


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


@router.get("/courses", response_model=list[AdminCourseListOut])
def admin_list_courses(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AdminCourseListOut]:
    rows = db.query(Course).order_by(Course.id.desc()).all()
    return [AdminCourseListOut.model_validate(row) for row in rows]


@router.post("/courses", response_model=CourseDetailAdminOut, status_code=status.HTTP_201_CREATED)
def admin_create_course(
    payload: CourseCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CourseDetailAdminOut:
    code = payload.code.strip().upper()
    slug = payload.slug.strip().lower()
    if db.query(Course).filter((Course.code == code) | (Course.slug == slug)).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code or slug already exists")

    pass_percent = (
        payload.pass_percent
        if "pass_percent" in payload.model_fields_set
        else default_pass_percent(db)
    )
    completion_title = get_settings_map(db).get("completion_cert_title", "Certificate of Completion")

    course = Course(
        code=code,
        title=strip_plain_text(payload.title.strip()) or "",
        description=strip_plain_text(payload.description.strip()) or "",
        slug=slug,
        status="draft",
        cover_url=payload.cover_url,
        pass_percent=pass_percent,
        price_cents=payload.price_cents,
    )
    db.add(course)
    db.flush()
    db.add(
        CertificateTemplate(
            course_id=course.id,
            title=completion_title,
            body="This certifies that {student_name} has successfully completed {course_title}.",
        )
    )
    db.add(FinalExam(course_id=course.id, title="Final Exam", pass_percent=pass_percent))
    db.commit()
    return _course_admin_out(_load_course_admin(db, course.id))


@router.get("/courses/{course_id}", response_model=CourseDetailAdminOut)
def admin_get_course(
    course_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CourseDetailAdminOut:
    return _course_admin_out(_load_course_admin(db, course_id))


@router.patch("/courses/{course_id}", response_model=CourseDetailAdminOut)
def admin_update_course(
    course_id: int,
    payload: CourseUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CourseDetailAdminOut:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    data = payload.model_dump(exclude_unset=True)
    next_status = data.pop("status", None)
    if next_status is not None and next_status not in ("draft", "published"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if "code" in data and data["code"]:
        data["code"] = data["code"].strip().upper()
    if "slug" in data and data["slug"]:
        data["slug"] = data["slug"].strip().lower()
    _apply_plain_text_fields(data, "title", "description")

    meta = {key: data[key] for key in COURSE_DRAFT_META_KEYS if key in data}
    _write_course_meta(course, meta)

    if next_status == "published":
        loaded = _load_course_admin(db, course_id)
        # Validate against working content (draft details are overlaid separately below).
        publish_errors = _publish_content_errors(loaded)
        if publish_errors:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=publish_errors[0])
        _apply_course_draft_meta(course)
        course.status = "published"
    elif next_status == "draft":
        # Keep any pending detail edits in draft_meta while unpublishing, or fold them in.
        _apply_course_draft_meta(course)
        course.status = "draft"

    db.commit()
    return _course_admin_out(_load_course_admin(db, course_id))


@router.post("/courses/{course_id}/save-changes", response_model=CourseDetailAdminOut)
def admin_save_course_changes(
    course_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CourseDetailAdminOut:
    """Promote draft detail edits onto the live (published) course fields."""
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if course.status == "published":
        _apply_course_draft_meta(course)
    else:
        # Draft courses already persist to live columns on autosave.
        course.draft_meta = None
        course.has_unpublished_changes = False

    db.commit()
    return _course_admin_out(_load_course_admin(db, course_id))


@router.delete("/courses/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_course(
    course_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    db.delete(course)
    db.commit()


# --- Chapters ---


@router.post("/courses/{course_id}/chapters", response_model=ChapterOut, status_code=status.HTTP_201_CREATED)
def admin_create_chapter(
    course_id: int,
    payload: ChapterCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Chapter:
    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    chapter = Chapter(
        course_id=course_id,
        title=strip_plain_text(payload.title.strip()) or "",
        sort_order=payload.sort_order,
    )
    db.add(chapter)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.patch("/chapters/{chapter_id}", response_model=ChapterOut)
def admin_update_chapter(
    chapter_id: int,
    payload: ChapterUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Chapter:
    chapter = (
        db.query(Chapter)
        .options(
            joinedload(Chapter.lessons).joinedload(Lesson.blocks),
            joinedload(Chapter.blocks).joinedload(ContentBlock.quiz).joinedload(Quiz.questions).joinedload(QuizQuestion.choices),
        )
        .filter(Chapter.id == chapter_id)
        .first()
    )
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "title" and isinstance(value, str):
            value = strip_plain_text(value.strip()) or ""
        setattr(chapter, key, value)
    db.commit()
    db.refresh(chapter)
    return chapter


@router.delete("/chapters/{chapter_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_chapter(
    chapter_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    db.delete(chapter)
    db.commit()


# --- Lessons ---


@router.post("/chapters/{chapter_id}/lessons", response_model=LessonOut, status_code=status.HTTP_201_CREATED)
def admin_create_lesson(
    chapter_id: int,
    payload: LessonCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Lesson:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    lesson = Lesson(
        chapter_id=chapter_id,
        title=strip_plain_text(payload.title.strip()) or "",
        body=sanitize_html(payload.body),
        sort_order=payload.sort_order,
    )
    db.add(lesson)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.patch("/lessons/{lesson_id}", response_model=LessonOut)
def admin_update_lesson(
    lesson_id: int,
    payload: LessonUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Lesson:
    lesson = (
        db.query(Lesson)
        .options(joinedload(Lesson.blocks).joinedload(ContentBlock.quiz).joinedload(Quiz.questions).joinedload(QuizQuestion.choices))
        .filter(Lesson.id == lesson_id)
        .first()
    )
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    for key, value in payload.model_dump(exclude_unset=True).items():
        if key == "title" and isinstance(value, str):
            value = strip_plain_text(value.strip()) or ""
        if key == "body":
            value = sanitize_html(value)
        setattr(lesson, key, value)
    db.commit()
    db.refresh(lesson)
    return lesson


@router.delete("/lessons/{lesson_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_lesson(
    lesson_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    db.delete(lesson)
    db.commit()


# --- Content blocks ---


@router.post(
    "/lessons/{lesson_id}/blocks",
    response_model=ContentBlockOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_block(
    lesson_id: int,
    payload: ContentBlockCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContentBlock:
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if payload.block_type not in TOPIC_BLOCK_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Topic content only supports text, video, pdf, document, image, epub, subtopic, or link blocks",
        )
    parent_id = _validate_topic_parent(
        db,
        lesson_id=lesson_id,
        parent_id=payload.parent_id,
        block_type=payload.block_type,
    )

    block = ContentBlock(
        lesson_id=lesson_id,
        chapter_id=None,
        parent_id=parent_id,
        block_type=payload.block_type,
        title=strip_plain_text(payload.title),
        body=sanitize_html(payload.body),
        url=payload.url,
        label=strip_plain_text(payload.label),
        quiz_id=None,
        sort_order=payload.sort_order,
    )
    db.add(block)
    db.commit()
    block = (
        db.query(ContentBlock)
        .options(joinedload(ContentBlock.quiz).joinedload(Quiz.questions).joinedload(QuizQuestion.choices))
        .filter(ContentBlock.id == block.id)
        .one()
    )
    return block


@router.post(
    "/chapters/{chapter_id}/blocks",
    response_model=ContentBlockOut,
    status_code=status.HTTP_201_CREATED,
)
def admin_create_chapter_block(
    chapter_id: int,
    payload: ContentBlockCreate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContentBlock:
    chapter = db.query(Chapter).filter(Chapter.id == chapter_id).first()
    if chapter is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Chapter not found")
    if payload.block_type not in CHAPTER_ALLOWED_BLOCK_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chapter blocks only support quiz, assignment, reading, or media uploads",
        )
    if payload.block_type in CHAPTER_UPLOAD_TYPES and payload.parent_id is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chapter uploads cannot be nested under another block",
        )

    quiz_id = None
    if payload.block_type == "quiz":
        quiz = Quiz(title=strip_plain_text(payload.quiz_title) or "Quiz")
        db.add(quiz)
        db.flush()
        quiz_questions = payload.quiz_questions
        if not quiz_questions:
            quiz_questions = [
                QuizQuestionIn(
                    prompt="Enter your question here",
                    choices=[
                        QuizChoiceIn(
                            text="Correct answer — edit this option",
                            is_correct=True,
                            sort_order=0,
                        ),
                        QuizChoiceIn(
                            text="Another option — edit this",
                            is_correct=False,
                            sort_order=1,
                        ),
                    ],
                )
            ]
        _replace_questions(db, quiz_questions, quiz_id=quiz.id)
        quiz_id = quiz.id

    if payload.block_type == "assignment":
        _validate_assignment(payload.url, payload.body)
    title = strip_plain_text(payload.title)
    if payload.block_type == "reading":
        _validate_reading_url(payload.url)
        if not title:
            title = _reading_display_name(payload.url or "")

    block = ContentBlock(
        lesson_id=None,
        chapter_id=chapter_id,
        parent_id=None,
        block_type=payload.block_type,
        title=title,
        body=sanitize_html(payload.body),
        url=payload.url,
        label=strip_plain_text(payload.label),
        quiz_id=quiz_id,
        sort_order=payload.sort_order,
    )
    db.add(block)
    db.commit()
    block = (
        db.query(ContentBlock)
        .options(joinedload(ContentBlock.quiz).joinedload(Quiz.questions).joinedload(QuizQuestion.choices))
        .filter(ContentBlock.id == block.id)
        .one()
    )
    return block


@router.patch("/blocks/{block_id}", response_model=ContentBlockOut)
def admin_update_block(
    block_id: int,
    payload: ContentBlockUpdate,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> ContentBlock:
    block = (
        db.query(ContentBlock)
        .options(joinedload(ContentBlock.quiz).joinedload(Quiz.questions).joinedload(QuizQuestion.choices))
        .filter(ContentBlock.id == block_id)
        .first()
    )
    if block is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")

    data = payload.model_dump(exclude_unset=True)
    if block.block_type == "assignment" and ("url" in data or "body" in data):
        _validate_assignment(data.get("url", block.url), data.get("body", block.body))
    if block.block_type == "reading" and ("url" in data or "title" in data):
        if "url" in data:
            _validate_reading_url(data.get("url"))
        url = data.get("url", block.url) or ""
        next_title = strip_plain_text(data["title"]) if "title" in data else block.title
        if not (next_title or "").strip() and url:
            data["title"] = _reading_display_name(url)

    quiz_questions = data.pop("quiz_questions", None)
    quiz_title = data.pop("quiz_title", None)
    if "parent_id" in data and block.lesson_id is not None:
        data["parent_id"] = _validate_topic_parent(
            db,
            lesson_id=block.lesson_id,
            parent_id=data["parent_id"],
            block_type=block.block_type,
            block_id=block.id,
        )
    for key, value in data.items():
        if key == "body":
            value = sanitize_html(value)
        if key in {"title", "label"} and isinstance(value, str):
            value = strip_plain_text(value)
        setattr(block, key, value)

    if block.block_type == "quiz" and block.quiz_id:
        quiz = db.query(Quiz).filter(Quiz.id == block.quiz_id).first()
        if quiz and quiz_title is not None:
            quiz.title = strip_plain_text(quiz_title) or "Quiz"
        if quiz and quiz_questions is not None:
            _replace_questions(db, quiz_questions, quiz_id=quiz.id)

    db.commit()
    block = (
        db.query(ContentBlock)
        .options(joinedload(ContentBlock.quiz).joinedload(Quiz.questions).joinedload(QuizQuestion.choices))
        .filter(ContentBlock.id == block_id)
        .one()
    )
    return block


@router.delete("/blocks/{block_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_block(
    block_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    block = db.query(ContentBlock).filter(ContentBlock.id == block_id).first()
    if block is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Block not found")
    _delete_block_tree(db, block)
    db.commit()


@router.put("/lessons/{lesson_id}/blocks/reorder", status_code=status.HTTP_204_NO_CONTENT)
def admin_reorder_lesson_blocks(
    lesson_id: int,
    payload: BlockReorderRequest,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    lesson = db.query(Lesson).filter(Lesson.id == lesson_id).first()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    requested_ids = [item.id for item in payload.items]
    blocks = (
        db.query(ContentBlock)
        .filter(ContentBlock.lesson_id == lesson_id, ContentBlock.id.in_(requested_ids))
        .all()
    )
    if len(blocks) != len(set(requested_ids)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="All reorder items must belong to this topic",
        )
    parent_ids = {block.parent_id for block in blocks}
    if len(parent_ids) != 1:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Reorder items must be siblings",
        )
    blocks_by_id = {block.id: block for block in blocks}
    for item in payload.items:
        blocks_by_id[item.id].sort_order = item.sort_order
    db.commit()


# --- Final exam & certificate ---


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

MAX_UPLOAD_BYTES = 500 * 1024 * 1024
UPLOAD_CHUNK_BYTES = 1024 * 1024


@router.post("/uploads", response_model=UploadOut)
async def admin_upload(
    request: Request,
    _: User = Depends(require_admin),
) -> UploadOut:
    form = await request.form(max_part_size=MAX_UPLOAD_BYTES)
    uploaded = form.get("file")
    if not isinstance(uploaded, UploadFile):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Missing file upload",
        )
    file = uploaded

    upload_root = Path(settings.upload_dir)
    upload_root.mkdir(parents=True, exist_ok=True)
    suffix = Path(file.filename or "file").suffix.lower()
    if suffix not in ALLOWED_UPLOAD_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File type not allowed. Use videos, images, PDF, EPUB, or Word.",
        )
    safe_name = f"{uuid.uuid4().hex}{suffix}"
    dest = upload_root / safe_name
    written = 0
    try:
        with dest.open("wb") as out:
            while True:
                chunk = await file.read(UPLOAD_CHUNK_BYTES)
                if not chunk:
                    break
                written += len(chunk)
                if written > MAX_UPLOAD_BYTES:
                    raise HTTPException(
                        status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        detail="File is too large. Maximum upload size is 500 MB.",
                    )
                out.write(chunk)
    except Exception:
        if dest.exists():
            dest.unlink(missing_ok=True)
        raise

    if written == 0:
        if dest.exists():
            dest.unlink(missing_ok=True)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    display_name = (file.filename or safe_name)[:120]
    return UploadOut(url=f"/api/uploads/{safe_name}", filename=display_name)


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
    _validate_upload_url(payload.file_url, field="File")
    if payload.cover_url:
        _validate_upload_url(payload.cover_url, field="Cover")

    asset = MediaAsset(
        title=payload.title.strip(),
        description=strip_plain_text(payload.description),
        file_url=payload.file_url.strip(),
        cover_url=payload.cover_url.strip() if payload.cover_url else None,
        category=payload.category.strip().lower() or "magazine",
        published=payload.published,
        featured=payload.featured,
        sort_order=payload.sort_order,
    )
    db.add(asset)
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
    asset = db.query(MediaAsset).filter(MediaAsset.id == asset_id).first()
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Media asset not found")

    data = payload.model_dump(exclude_unset=True)
    if "file_url" in data:
        _validate_upload_url(data["file_url"], field="File")
    if data.get("cover_url"):
        _validate_upload_url(data["cover_url"], field="Cover")
    if "title" in data and data["title"]:
        data["title"] = data["title"].strip()
    if "description" in data:
        data["description"] = strip_plain_text(data["description"])
    if "category" in data and data["category"]:
        data["category"] = data["category"].strip().lower()

    for key, value in data.items():
        setattr(asset, key, value)
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

    failed: list[str] = []
    sent_count = 0
    for row in subscribers:
        try:
            send_email(
                to=row.email,
                subject=subject,
                html_body=body_html,
                attachments=attachments,
            )
            sent_count += 1
        except EmailDeliveryError:
            failed.append(row.email)

    if sent_count == 0:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Unable to deliver newsletter to any recipient. Check SMTP settings.",
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


def _payment_out(row: Payment) -> PaymentOut:
    order = row.order
    items = order.items if order and order.items else []
    if not items:
        course_title = ""
    elif len(items) == 1:
        course_title = items[0].title
    else:
        course_title = f"{items[0].title} +{len(items) - 1} more"
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
        receipt_printed_at=row.receipt_printed_at,
        reviewed_at=row.reviewed_at,
    )


@router.get("/payments", response_model=list[PaymentOut])
def admin_list_payments(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[PaymentOut]:
    rows = (
        db.query(Payment)
        .options(
            joinedload(Payment.user),
            joinedload(Payment.order).joinedload(Order.items),
        )
        .order_by(Payment.created_at.desc())
        .limit(200)
        .all()
    )
    return [_payment_out(row) for row in rows]


@router.get("/payments/{payment_id}", response_model=PaymentOut)
def admin_get_payment(
    payment_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaymentOut:
    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items))
        .filter(Payment.id == payment_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    return _payment_out(row)


@router.post("/payments/{payment_id}/print", response_model=PaymentOut)
def admin_mark_receipt_printed(
    payment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaymentOut:
    row = db.query(Payment).options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items)).filter(Payment.id == payment_id).first()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    row.receipt_printed_at = datetime.now(timezone.utc)
    row.reviewed_at = row.reviewed_at or datetime.now(timezone.utc)
    row.reviewed_by_id = admin.id
    db.commit()
    db.refresh(row)
    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items))
        .filter(Payment.id == payment_id)
        .one()
    )
    return _payment_out(row)


@router.post("/payments/{payment_id}/refund", response_model=PaymentOut)
def admin_refund_payment(
    payment_id: int,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> PaymentOut:
    from app.services.commerce import refund_payment

    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items), joinedload(Payment.order).joinedload(Order.invoices))
        .filter(Payment.id == payment_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Payment not found")
    if row.status == "refunded":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already refunded")
    try:
        refund_payment(db, row, admin)
        db.commit()
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    row = (
        db.query(Payment)
        .options(joinedload(Payment.user), joinedload(Payment.order).joinedload(Order.items))
        .filter(Payment.id == payment_id)
        .one()
    )
    return _payment_out(row)


@router.get("/promotions", response_model=list[PromotionOut])
def admin_list_promotions(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Promotion]:
    return db.query(Promotion).order_by(Promotion.created_at.desc()).all()


@router.post("/promotions", response_model=PromotionOut, status_code=status.HTTP_201_CREATED)
def admin_create_promotion(
    payload: PromotionIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Promotion:
    code = payload.code.strip().upper()
    if db.query(Promotion).filter(Promotion.code == code).first():
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code already exists")
    promo = Promotion(
        code=code,
        description=payload.description.strip(),
        percent_off=payload.percent_off,
        amount_off_cents=payload.amount_off_cents,
        complimentary=payload.complimentary or (payload.percent_off or 0) >= 100,
        max_redemptions=payload.max_redemptions,
        expires_at=payload.expires_at,
        course_id=payload.course_id,
        active=payload.active,
    )
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo


@router.patch("/promotions/{promotion_id}", response_model=PromotionOut)
def admin_update_promotion(
    promotion_id: int,
    payload: PromotionIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> Promotion:
    promo = db.query(Promotion).filter(Promotion.id == promotion_id).first()
    if promo is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Promotion not found")
    code = payload.code.strip().upper()
    clash = db.query(Promotion).filter(Promotion.code == code, Promotion.id != promotion_id).first()
    if clash:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Code already exists")
    promo.code = code
    promo.description = payload.description.strip()
    promo.percent_off = payload.percent_off
    promo.amount_off_cents = payload.amount_off_cents
    promo.complimentary = payload.complimentary or (payload.percent_off or 0) >= 100
    promo.max_redemptions = payload.max_redemptions
    promo.expires_at = payload.expires_at
    promo.course_id = payload.course_id
    promo.active = payload.active
    db.commit()
    db.refresh(promo)
    return promo


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


@router.get("/students/{student_id}/assignment-submissions", response_model=list[AssignmentSubmissionOut])
def admin_list_assignment_submissions(
    student_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[AssignmentSubmissionOut]:
    rows = (
        db.query(AssignmentSubmission)
        .options(joinedload(AssignmentSubmission.block).joinedload(ContentBlock.chapter).joinedload(Chapter.course))
        .filter(AssignmentSubmission.user_id == student_id)
        .order_by(AssignmentSubmission.created_at.desc())
        .all()
    )
    items: list[AssignmentSubmissionOut] = []
    for row in rows:
        block = row.block
        chapter = block.chapter if block else None
        course = chapter.course if chapter else None
        items.append(
            AssignmentSubmissionOut(
                id=row.id,
                content_block_id=row.content_block_id,
                assignment_title=(block.title if block and block.title else "Assignment"),
                course_code=course.code if course else "",
                course_title=course.title if course else "",
                body=row.body,
                file_url=row.file_url,
                file_name=row.file_name,
                status=row.status,
            )
        )
    return items


@router.post("/assignment-submissions/{submission_id}/review", response_model=AssignmentSubmissionOut)
def admin_review_assignment(
    submission_id: int,
    payload: AssignmentReviewIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> AssignmentSubmissionOut:
    row = (
        db.query(AssignmentSubmission)
        .options(joinedload(AssignmentSubmission.block).joinedload(ContentBlock.chapter).joinedload(Chapter.course))
        .filter(AssignmentSubmission.id == submission_id)
        .first()
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    row.status = payload.status
    db.commit()
    block = row.block
    chapter = block.chapter if block else None
    course = chapter.course if chapter else None
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
    )


@router.get("/membership-applications")
def admin_list_membership_applications(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.query(MembershipApplication).order_by(MembershipApplication.created_at.desc()).limit(200).all()
    return [
        {
            "id": row.id,
            "full_name": row.full_name,
            "email": row.email,
            "phone": row.phone,
            "membership_type": row.membership_type,
            "membership_status": row.membership_status,
            "created_at": row.created_at.isoformat() if row.created_at else None,
        }
        for row in rows
    ]


# --- Industry events calendar ---


@router.get("/events", response_model=list[IndustryEventOut])
def admin_list_events(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[IndustryEventOut]:
    rows = (
        db.query(IndustryEvent)
        .order_by(IndustryEvent.starts_on.asc(), IndustryEvent.sort_order.asc())
        .all()
    )
    return [IndustryEventOut.model_validate(row) for row in rows]


@router.post("/events", response_model=IndustryEventOut, status_code=status.HTTP_201_CREATED)
def admin_create_event(
    payload: IndustryEventCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> IndustryEventOut:
    if payload.report_file_url:
        _validate_upload_url(payload.report_file_url, field="Report file")
    event = IndustryEvent(
        title=payload.title.strip(),
        summary=(payload.summary or "").strip() or None,
        location=(payload.location or "").strip() or None,
        region=(payload.region or "").strip() or None,
        event_type=(payload.event_type or "conference").strip().lower() or "conference",
        starts_on=payload.starts_on,
        ends_on=payload.ends_on,
        source_name=(payload.source_name or "").strip() or None,
        source_url=(payload.source_url or "").strip() or None,
        report_file_url=payload.report_file_url,
        cpd_hours=payload.cpd_hours,
        published=payload.published,
        featured=payload.featured,
        sort_order=payload.sort_order,
    )
    db.add(event)
    db.commit()
    db.refresh(event)
    return IndustryEventOut.model_validate(event)


@router.patch("/events/{event_id}", response_model=IndustryEventOut)
def admin_update_event(
    event_id: int,
    payload: IndustryEventUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> IndustryEventOut:
    event = db.query(IndustryEvent).filter(IndustryEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    data = payload.model_dump(exclude_unset=True)
    if "report_file_url" in data and data["report_file_url"]:
        _validate_upload_url(data["report_file_url"], field="Report file")
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip() or None if key != "title" and key != "event_type" else value.strip()
            if key == "title" and not value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required")
            if key == "event_type" and value:
                value = value.lower()
        setattr(event, key, value)
    db.commit()
    db.refresh(event)
    return IndustryEventOut.model_validate(event)


@router.delete("/events/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_event(
    event_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    event = db.query(IndustryEvent).filter(IndustryEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Event not found")
    db.delete(event)
    db.commit()


# --- CPD activities ---


@router.get("/cpd-activities", response_model=list[CpdActivityOut])
def admin_list_cpd_activities(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[CpdActivityOut]:
    rows = (
        db.query(CpdActivity)
        .order_by(CpdActivity.sort_order.asc(), CpdActivity.activity.asc())
        .all()
    )
    return [CpdActivityOut.model_validate(row) for row in rows]


@router.post("/cpd-activities", response_model=CpdActivityOut, status_code=status.HTTP_201_CREATED)
def admin_create_cpd_activity(
    payload: CpdActivityCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CpdActivityOut:
    row = CpdActivity(
        activity=payload.activity.strip(),
        category=(payload.category or "course").strip().lower() or "course",
        hours_reported=payload.hours_reported,
        hours_approved=payload.hours_approved,
        published=payload.published,
        sort_order=payload.sort_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return CpdActivityOut.model_validate(row)


@router.patch("/cpd-activities/{activity_id}", response_model=CpdActivityOut)
def admin_update_cpd_activity(
    activity_id: int,
    payload: CpdActivityUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> CpdActivityOut:
    row = db.query(CpdActivity).filter(CpdActivity.id == activity_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CPD activity not found")
    data = payload.model_dump(exclude_unset=True)
    for key, value in data.items():
        if isinstance(value, str):
            value = value.strip()
            if key == "category":
                value = value.lower()
            if key == "activity" and not value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Activity is required")
        setattr(row, key, value)
    db.commit()
    db.refresh(row)
    return CpdActivityOut.model_validate(row)


@router.delete("/cpd-activities/{activity_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_cpd_activity(
    activity_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(CpdActivity).filter(CpdActivity.id == activity_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="CPD activity not found")
    db.delete(row)
    db.commit()


def _job_out(row: JobPosting, *, now: datetime | None = None) -> JobPostingOut:
    current = now or datetime.now(timezone.utc)
    expires = row.expires_on
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    payload = JobPostingOut.model_validate(row)
    payload.is_expired = expires < current
    return payload


@router.get("/jobs", response_model=list[JobPostingOut])
def admin_list_jobs(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[JobPostingOut]:
    now = datetime.now(timezone.utc)
    rows = (
        db.query(JobPosting)
        .order_by(JobPosting.posted_on.desc(), JobPosting.sort_order.asc())
        .all()
    )
    return [_job_out(row, now=now) for row in rows]


@router.post("/jobs", response_model=JobPostingOut, status_code=status.HTTP_201_CREATED)
def admin_create_job(
    payload: JobPostingCreateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    if payload.expires_on < payload.posted_on:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be on or after the upload/post date.",
        )
    if payload.attachment_url:
        _validate_upload_url(payload.attachment_url, field="Attachment")
    row = JobPosting(
        title=payload.title.strip(),
        company=(payload.company or "").strip() or None,
        location=(payload.location or "").strip() or None,
        employment_type=(payload.employment_type or "full-time").strip().lower() or "full-time",
        summary=(payload.summary or "").strip() or None,
        description=(payload.description or "").strip() or None,
        apply_url=(payload.apply_url or "").strip() or None,
        attachment_url=payload.attachment_url,
        source_label=(payload.source_label or "").strip() or None,
        posted_on=payload.posted_on,
        expires_on=payload.expires_on,
        published=payload.published,
        featured=payload.featured,
        sort_order=payload.sort_order,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return _job_out(row)


@router.patch("/jobs/{job_id}", response_model=JobPostingOut)
def admin_update_job(
    job_id: int,
    payload: JobPostingUpdateIn,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> JobPostingOut:
    row = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    data = payload.model_dump(exclude_unset=True)
    if "attachment_url" in data and data["attachment_url"]:
        _validate_upload_url(data["attachment_url"], field="Attachment")
    for key, value in data.items():
        if isinstance(value, str) and key in {
            "title",
            "company",
            "location",
            "employment_type",
            "summary",
            "description",
            "apply_url",
            "source_label",
        }:
            value = value.strip()
            if key == "title" and not value:
                raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Title is required")
            if key == "employment_type" and value:
                value = value.lower()
            if key != "title" and not value:
                value = None
        setattr(row, key, value)
    if row.expires_on < row.posted_on:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Expiry date must be on or after the upload/post date.",
        )
    db.commit()
    db.refresh(row)
    return _job_out(row)


@router.delete("/jobs/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def admin_delete_job(
    job_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> None:
    row = db.query(JobPosting).filter(JobPosting.id == job_id).first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    db.delete(row)
    db.commit()
