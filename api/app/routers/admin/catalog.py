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
        content_protection=bool(payload.content_protection),
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

    # Apply immediately on live course (not draft_meta) so portal lockdown updates without publish.
    if "content_protection" in data:
        course.content_protection = bool(data.pop("content_protection"))

    if "price_cents" in data:
        from app.services.course_price import set_live_course_price

        set_live_course_price(course, data.pop("price_cents"))

    meta = {key: data[key] for key in COURSE_DRAFT_META_KEYS if key in data}
    _write_course_meta(course, meta)

    was_published = course.status == "published"
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

    newly_published = not was_published and course.status == "published"
    if newly_published:
        from app.services.notifications import notify_all_students

        notify_all_students(
            db,
            title="New course available",
            body=(
                f'"{course.title}" ({course.code}) is now available. '
                "Open My courses to view details and enroll."
            ),
            kind="course_added",
            link="/courses",
        )

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
        from app.services.notifications import notify_enrolled_students

        _apply_course_draft_meta(course)
        notify_enrolled_students(
            db,
            course.id,
            title="Course updated",
            body=(
                f'"{course.title}" ({course.code}) was updated. '
                "Open My courses to review the latest content."
            ),
            kind="course_update",
            link=f"/courses/{course.id}",
        )
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
    from app.models import CartItem, OrderItem
    from app.services.notifications import notify_users

    course = db.query(Course).filter(Course.id == course_id).first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    title = course.title
    code = course.code
    affected_user_ids = {
        row[0]
        for row in db.query(Enrollment.user_id).filter(Enrollment.course_id == course_id).all()
    }
    affected_user_ids.update(
        row[0]
        for row in db.query(CartItem.user_id).filter(CartItem.course_id == course_id).all()
    )

    db.query(OrderItem).filter(OrderItem.course_id == course_id).update(
        {OrderItem.course_id: None},
        synchronize_session=False,
    )
    db.query(CartItem).filter(CartItem.course_id == course_id).delete(synchronize_session=False)
    db.query(Certificate).filter(Certificate.course_id == course_id).delete(synchronize_session=False)
    db.query(Enrollment).filter(Enrollment.course_id == course_id).delete(synchronize_session=False)

    if affected_user_ids:
        notify_users(
            db,
            affected_user_ids,
            title="Course removed",
            body=(
                f'"{title}" ({code}) is no longer available. '
                "It has been removed from your courses and cart. Contact CAISBE if you need help."
            ),
            kind="course_removed",
            link="/courses",
        )

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
        points_possible=payload.points_possible if payload.block_type == "assignment" else None,
        due_at=payload.due_at if payload.block_type == "assignment" else None,
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
    if block.block_type != "assignment":
        data.pop("points_possible", None)
        data.pop("due_at", None)
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


@router.get(
    "/courses/{course_id}/exam-attempts/{attempt_id}/integrity",
    response_model=list[ExamIntegrityEventOut],
)
def admin_exam_attempt_integrity(
    course_id: int,
    attempt_id: int,
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[ExamIntegrityEvent]:
    attempt = (
        db.query(QuizAttempt)
        .options(joinedload(QuizAttempt.final_exam))
        .filter(QuizAttempt.id == attempt_id, QuizAttempt.final_exam_id.isnot(None))
        .first()
    )
    if attempt is None or attempt.final_exam is None or attempt.final_exam.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Exam attempt not found")
    return (
        db.query(ExamIntegrityEvent)
        .filter(
            ExamIntegrityEvent.user_id == attempt.user_id,
            ExamIntegrityEvent.final_exam_id == attempt.final_exam_id,
        )
        .order_by(ExamIntegrityEvent.created_at.asc(), ExamIntegrityEvent.id.asc())
        .all()
    )


