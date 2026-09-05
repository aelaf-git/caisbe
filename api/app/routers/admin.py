from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, Request, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.auth import require_admin
from app.config import settings
from app.db import get_db
from app.html_sanitize import sanitize_html, strip_plain_text
from app.models import (
    Certificate,
    CertificateTemplate,
    Chapter,
    ContentBlock,
    Course,
    Enrollment,
    FinalExam,
    Lesson,
    MediaAsset,
    NewsletterCampaign,
    NewsletterSubscriber,
    Quiz,
    QuizChoice,
    QuizQuestion,
    User,
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
    CourseDetailAdminOut,
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
from app.schemas.media import (
    MediaAssetCreateIn,
    MediaAssetOut,
    MediaAssetUpdateIn,
    NewsletterCampaignOut,
    NewsletterSendIn,
    NewsletterSendOut,
    NewsletterSubscriberOut,
)
from app.services.email import EmailDeliveryError, load_upload_attachment, send_email

router = APIRouter(prefix="/admin", tags=["admin"])

TOPIC_BLOCK_TYPES = {"text", "video", "pdf", "document", "image", "epub", "subtopic", "link"}
TOPIC_SECTION_TYPES = {"text", "subtopic"}
TOPIC_MEDIA_TYPES = {"video", "pdf", "document", "image", "epub", "link"}
CHAPTER_BLOCK_TYPES = {"quiz", "assignment"}
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


def _validate_assignment_url(url: str | None) -> None:
    if not url or not url.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignment requires an attached PDF or Word file.",
        )
    path = url.split("?")[0].lower()
    if not path.endswith((".pdf", ".doc", ".docx")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Assignments must be a PDF or Word (.doc, .docx) file.",
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
    return CourseDetailAdminOut.model_validate(course)


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


@router.get("/courses", response_model=list[CourseOut])
def admin_list_courses(
    _: User = Depends(require_admin),
    db: Session = Depends(get_db),
) -> list[Course]:
    return db.query(Course).order_by(Course.id.desc()).all()


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

    course = Course(
        code=code,
        title=strip_plain_text(payload.title.strip()) or "",
        description=strip_plain_text(payload.description.strip()) or "",
        slug=slug,
        status="draft",
        cover_url=payload.cover_url,
        pass_percent=payload.pass_percent,
    )
    db.add(course)
    db.flush()
    db.add(
        CertificateTemplate(
            course_id=course.id,
            title="Certificate of Completion",
            body="This certifies that {student_name} has successfully completed {course_title}.",
        )
    )
    db.add(FinalExam(course_id=course.id, title="Final Exam", pass_percent=payload.pass_percent))
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
    if "status" in data and data["status"] not in ("draft", "published"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    if "code" in data and data["code"]:
        data["code"] = data["code"].strip().upper()
    if "slug" in data and data["slug"]:
        data["slug"] = data["slug"].strip().lower()
    _apply_plain_text_fields(data, "title", "description")

    if data.get("status") == "published":
        loaded = _load_course_admin(db, course_id)
        publish_errors = _publish_content_errors(loaded)
        if publish_errors:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=publish_errors[0])

    for key, value in data.items():
        setattr(course, key, value)
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
            detail="Chapter blocks only support quiz, assignment, or media uploads",
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
        _validate_assignment_url(payload.url)

    block = ContentBlock(
        lesson_id=None,
        chapter_id=chapter_id,
        parent_id=None,
        block_type=payload.block_type,
        title=strip_plain_text(payload.title),
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
    if block.block_type == "assignment" and "url" in data:
        _validate_assignment_url(data.get("url"))

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
    query = db.query(MediaAsset)
    if category:
        query = query.filter(MediaAsset.category == category.strip().lower())
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
