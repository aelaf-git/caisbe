"""Seed five chapter quizzes per chapter (idempotent)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import (
    Chapter,
    ContentBlock,
    Course,
    Quiz,
    QuizChoice,
    QuizQuestion,
)

QUIZZES_PER_CHAPTER = 5
QUESTIONS_PER_QUIZ = 2


def _question_bank(chapter_title: str, course_code: str, quiz_number: int) -> list[dict]:
    """Build two multiple-choice questions tailored to the chapter."""
    base = chapter_title.strip()
    code = course_code.upper()
    return [
        {
            "prompt": f"In “{base}”, what is the most accurate summary of a key learning objective?",
            "choices": [
                {"text": f"Apply core concepts from {base} to real decisions", "correct": True},
                {"text": "Ignore stakeholder context when planning", "correct": False},
                {"text": "Avoid measuring outcomes after implementation", "correct": False},
                {"text": "Treat {code} topics as unrelated to practice".format(code=code), "correct": False},
            ],
        },
        {
            "prompt": f"Quiz {quiz_number} — which practice best supports success in “{base}”?",
            "choices": [
                {"text": "Define clear goals and review progress regularly", "correct": True},
                {"text": "Skip documentation to save time", "correct": False},
                {"text": "Defer communication until the final stage", "correct": False},
                {"text": "Use a single approach for every situation", "correct": False},
            ],
        },
    ]


def _create_quiz_block(
    db: Session,
    chapter: Chapter,
    course_code: str,
    quiz_number: int,
    sort_order: int,
) -> None:
    title = f"Quiz {quiz_number}: {chapter.title}"
    quiz = Quiz(title=title)
    db.add(quiz)
    db.flush()

    for question_index, question_data in enumerate(
        _question_bank(chapter.title, course_code, quiz_number)
    ):
        question = QuizQuestion(
            quiz_id=quiz.id,
            prompt=question_data["prompt"],
            sort_order=question_index,
        )
        db.add(question)
        db.flush()
        for choice_index, choice_data in enumerate(question_data["choices"]):
            db.add(
                QuizChoice(
                    question_id=question.id,
                    text=choice_data["text"],
                    is_correct=choice_data["correct"],
                    sort_order=choice_index,
                )
            )

    db.add(
        ContentBlock(
            lesson_id=None,
            chapter_id=chapter.id,
            parent_id=None,
            block_type="quiz",
            title=title,
            body=None,
            quiz_id=quiz.id,
            sort_order=sort_order,
        )
    )


def seed_chapter_quizzes(db: Session) -> dict[str, int]:
    """Add quizzes until each chapter has QUIZZES_PER_CHAPTER. Returns summary counts."""
    created_blocks = 0
    skipped_chapters = 0

    courses = (
        db.query(Course)
        .order_by(Course.id.asc())
        .all()
    )
    for course in courses:
        chapters = (
            db.query(Chapter)
            .filter(Chapter.course_id == course.id)
            .order_by(Chapter.sort_order.asc(), Chapter.id.asc())
            .all()
        )
        for chapter in chapters:
            existing = (
                db.query(ContentBlock)
                .filter(
                    ContentBlock.chapter_id == chapter.id,
                    ContentBlock.block_type == "quiz",
                )
                .count()
            )
            if existing >= QUIZZES_PER_CHAPTER:
                skipped_chapters += 1
                continue

            next_sort = (
                db.query(ContentBlock.sort_order)
                .filter(ContentBlock.chapter_id == chapter.id)
                .order_by(ContentBlock.sort_order.desc())
                .limit(1)
                .scalar()
            )
            sort_base = (next_sort + 1) if next_sort is not None else 0

            for quiz_number in range(existing + 1, QUIZZES_PER_CHAPTER + 1):
                _create_quiz_block(
                    db,
                    chapter,
                    course.code,
                    quiz_number,
                    sort_base + (quiz_number - existing - 1),
                )
                created_blocks += 1

    db.commit()
    return {
        "created_blocks": created_blocks,
        "skipped_chapters": skipped_chapters,
    }


def run() -> None:
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        summary = seed_chapter_quizzes(db)
        if summary["created_blocks"] == 0:
            print("All chapters already have five quizzes.")
            return
        print(
            f"Created {summary['created_blocks']} chapter quiz blocks "
            f"({summary['skipped_chapters']} chapters already complete)."
        )
    finally:
        db.close()


if __name__ == "__main__":
    run()
