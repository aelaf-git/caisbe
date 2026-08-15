from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from app.auth import require_admin
from app.config import settings
from app.db import get_db
from app.html_sanitize import sanitize_html
from app.models import (
    CertificateTemplate,
    Chapter,
    ContentBlock,
    Course,
    FinalExam,
    Lesson,
    Quiz,
    QuizChoice,
    QuizQuestion,
    User,
)
from app.schemas.courses import (
    BlockReorderRequest,
    ChapterCreate,
    ChapterOut,
    ChapterUpdate,
    ContentBlockCreate,
    ContentBlockOut,
    ContentBlockUpdate,
    CertificateTemplateOut,
    CertificateTemplateUpdate,
    CourseCreate,
    CourseDetailAdminOut,
    CourseOut,
    CourseUpdate,
    FinalExamOut,
    FinalExamUpdate,
    LessonCreate,
    LessonOut,
    LessonUpdate,
    QuizOut,
    QuizQuestionIn,
    QuizUpdate,
    UploadOut,
)

router = APIRouter(prefix="/admin", tags=["admin"])

TOPIC_BLOCK_TYPES = {"text", "video", "pdf", "document", "image", "epub", "subtopic", "link"}
TOPIC_SECTION_TYPES = {"text", "subtopic"}
TOPIC_MEDIA_TYPES = {"video", "pdf", "document", "image", "epub", "link"}
CHAPTER_BLOCK_TYPES = {"quiz", "assignment"}

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


def _block_has_content(block: ContentBlock, children_by_parent: dict[int, list[ContentBlock]]) -> bool:
    if block.block_type == "text":
        if (block.body or "").strip() or (block.title or "").strip():
            return True
    elif block.block_type == "subtopic":
        if (block.title or "").strip() or (block.body or "").strip():
            return True
    children = children_by_parent.get(block.id, [])
    return any((child.url or "").strip() for child in children if child.block_type in TOPIC_MEDIA_TYPES)


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


def _validate_topic_parent(
    db: Session,
    *,
    lesson_id: int,
    parent_id: int | None,
    block_type: str,
) -> int | None:
    if block_type in TOPIC_SECTION_TYPES:
        if parent_id is not None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Text and subtopic blocks cannot be nested under another block",
            )
        return None
    if block_type in TOPIC_MEDIA_TYPES:
        if parent_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Uploads must be attached to a text or subtopic block",
            )
        parent = (
            db.query(ContentBlock)
            .filter(
                ContentBlock.id == parent_id,
                ContentBlock.lesson_id == lesson_id,
                ContentBlock.parent_id.is_(None),
                ContentBlock.block_type.in_(tuple(TOPIC_SECTION_TYPES)),
            )
            .first()
        )
        if parent is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Upload parent must be a text or subtopic block in this topic",
            )
        return parent_id
    return parent_id


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
    questions_in: list[QuizQuestionIn],
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
            prompt=q_in.prompt,
            sort_order=q_in.sort_order if q_in.sort_order else q_idx,
        )
        db.add(question)
        db.flush()
        for c_idx, c_in in enumerate(q_in.choices):
            db.add(
                QuizChoice(
                    question_id=question.id,
                    text=c_in.text,
                    is_correct=c_in.is_correct,
                    sort_order=c_in.sort_order if c_in.sort_order else c_idx,
                )
            )


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
        title=payload.title.strip(),
        description=payload.description.strip(),
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
    chapter = Chapter(course_id=course_id, title=payload.title.strip(), sort_order=payload.sort_order)
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
            value = value.strip()
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
        title=payload.title.strip(),
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
            value = value.strip()
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
        title=payload.title,
        body=sanitize_html(payload.body),
        url=payload.url,
        label=payload.label,
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
    if payload.block_type not in CHAPTER_BLOCK_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Chapter blocks only support quiz or assignment",
        )

    quiz_id = None
    if payload.block_type == "quiz":
        quiz = Quiz(title=payload.quiz_title or "Quiz")
        db.add(quiz)
        db.flush()
        _replace_questions(db, payload.quiz_questions, quiz_id=quiz.id)
        quiz_id = quiz.id

    block = ContentBlock(
        lesson_id=None,
        chapter_id=chapter_id,
        block_type=payload.block_type,
        title=payload.title,
        body=sanitize_html(payload.body),
        url=payload.url,
        label=payload.label,
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
    quiz_questions = data.pop("quiz_questions", None)
    quiz_title = data.pop("quiz_title", None)
    if "parent_id" in data and block.lesson_id is not None:
        data["parent_id"] = _validate_topic_parent(
            db,
            lesson_id=block.lesson_id,
            parent_id=data["parent_id"],
            block_type=block.block_type,
        )
    for key, value in data.items():
        if key == "body":
            value = sanitize_html(value)
        setattr(block, key, value)

    if block.block_type == "quiz" and block.quiz_id:
        quiz = db.query(Quiz).filter(Quiz.id == block.quiz_id).first()
        if quiz and quiz_title is not None:
            quiz.title = quiz_title
        if quiz and quiz_questions is not None:
            _replace_questions(db, [QuizQuestionIn.model_validate(q) for q in quiz_questions], quiz_id=quiz.id)

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
    quiz_id = block.quiz_id
    # Remove nested uploads when deleting a text/subtopic section.
    children = db.query(ContentBlock).filter(ContentBlock.parent_id == block_id).all()
    for child in children:
        db.delete(child)
    db.delete(block)
    if quiz_id:
        quiz = db.query(Quiz).filter(Quiz.id == quiz_id).first()
        if quiz:
            db.delete(quiz)
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

    blocks = {
        block.id: block
        for block in db.query(ContentBlock)
        .filter(ContentBlock.lesson_id == lesson_id, ContentBlock.parent_id.is_(None))
        .all()
    }
    for item in payload.items:
        block = blocks.get(item.id)
        if block is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Block {item.id} is not a top-level block in this topic",
            )
        block.sort_order = item.sort_order
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
        exam.title = payload.title
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
        template.title = payload.title
    if payload.body is not None:
        template.body = payload.body
    db.commit()
    db.refresh(template)
    return template


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
        quiz.title = payload.title
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


@router.post("/uploads", response_model=UploadOut)
async def admin_upload(
    file: UploadFile = File(...),
    _: User = Depends(require_admin),
) -> UploadOut:
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
    content = await file.read()
    dest.write_bytes(content)
    return UploadOut(url=f"/api/uploads/{safe_name}", filename=file.filename or safe_name)
