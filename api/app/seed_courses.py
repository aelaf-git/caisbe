"""Seed three CAISBE demo courses (idempotent by course code)."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.html_sanitize import sanitize_html
from app.models import (
    CertificateTemplate,
    Chapter,
    ContentBlock,
    Course,
    FinalExam,
    Lesson,
)

COURSE_SPECS: list[dict] = [
    {
        "code": "MEL",
        "slug": "mel",
        "title": "Master Executive Leadership: Strategy, Culture & Execution",
        "description": (
            "A comprehensive curriculum on strategy, culture, and execution for senior leaders "
            "building high-performing organizations."
        ),
        "pass_percent": 70,
        "chapters": [
            {
                "title": "Foundations of Executive Leadership",
                "topics": [
                    {
                        "title": "Leadership in Context",
                        "body": "<p>Explore how organizational context shapes leadership priorities, "
                        "stakeholder expectations, and strategic choices.</p>",
                    },
                    {
                        "title": "Culture as a Strategic Asset",
                        "body": "<p>Learn how culture influences performance, retention, and the "
                        "ability to execute change at scale.</p>",
                    },
                ],
            },
            {
                "title": "Strategy & Execution",
                "topics": [
                    {
                        "title": "Strategic Decision Making",
                        "body": "<p>Frameworks for evaluating trade-offs, allocating resources, and "
                        "aligning teams around clear outcomes.</p>",
                    },
                    {
                        "title": "Leading Through Change",
                        "body": "<p>Practical approaches to communication, resistance, and sustained "
                        "adoption when implementing new initiatives.</p>",
                    },
                ],
            },
        ],
    },
    {
        "code": "SBE101",
        "slug": "sustainable-built-environment",
        "title": "Introduction to the Sustainable Built Environment",
        "description": (
            "Core principles of sustainability in buildings and infrastructure: energy, materials, "
            "water, and lifecycle thinking for the built environment."
        ),
        "pass_percent": 75,
        "chapters": [
            {
                "title": "Sustainability Fundamentals",
                "topics": [
                    {
                        "title": "What Is a Sustainable Built Environment?",
                        "body": "<p>Define sustainability in the context of buildings, cities, and "
                        "infrastructure across environmental and social dimensions.</p>",
                    },
                    {
                        "title": "Lifecycle & Whole-Building Thinking",
                        "body": "<p>Understand embodied carbon, operational energy, and how design "
                        "decisions ripple across a project lifecycle.</p>",
                    },
                ],
            },
            {
                "title": "Green Building in Practice",
                "topics": [
                    {
                        "title": "Energy & Envelope Performance",
                        "body": "<p>Review insulation, glazing, HVAC integration, and passive design "
                        "strategies that reduce demand.</p>",
                    },
                    {
                        "title": "Materials & Circular Economy",
                        "body": "<p>Compare material choices, recycling pathways, and specifications "
                        "that support lower-impact construction.</p>",
                    },
                ],
            },
        ],
    },
    {
        "code": "GCM",
        "slug": "green-construction-management",
        "title": "Green Construction Management",
        "description": (
            "Manage construction projects with sustainability goals: scheduling, site practices, "
            "waste reduction, and stakeholder coordination."
        ),
        "pass_percent": 80,
        "chapters": [
            {
                "title": "Planning Sustainable Projects",
                "topics": [
                    {
                        "title": "Project Goals & Green Specifications",
                        "body": "<p>Set measurable sustainability targets and translate them into "
                        "contract language and subcontractor requirements.</p>",
                    },
                    {
                        "title": "Budgeting for Green Outcomes",
                        "body": "<p>Balance first cost with long-term value when prioritizing "
                        "sustainable systems and certifications.</p>",
                    },
                ],
            },
            {
                "title": "Site & Delivery",
                "topics": [
                    {
                        "title": "Waste Management on Site",
                        "body": "<p>Implement sorting, diversion, and reporting practices that keep "
                        "projects aligned with waste-reduction plans.</p>",
                    },
                    {
                        "title": "Commissioning & Handover",
                        "body": "<p>Close the loop with performance verification, owner training, and "
                        "documentation for ongoing operations.</p>",
                    },
                ],
            },
        ],
    },
]


def _add_chapters(db: Session, course: Course, chapters: list[dict]) -> None:
    for chapter_index, chapter_data in enumerate(chapters):
        chapter = Chapter(
            course_id=course.id,
            title=chapter_data["title"],
            sort_order=chapter_index,
        )
        db.add(chapter)
        db.flush()
        for topic_index, topic_data in enumerate(chapter_data["topics"]):
            lesson = Lesson(
                chapter_id=chapter.id,
                title=topic_data["title"],
                body=sanitize_html(topic_data["body"]),
                sort_order=topic_index,
            )
            db.add(lesson)
            db.flush()
            db.add(
                ContentBlock(
                    lesson_id=lesson.id,
                    block_type="text",
                    title=None,
                    body=sanitize_html(topic_data["body"]),
                    sort_order=0,
                )
            )


def ensure_course(db: Session, spec: dict) -> Course | None:
    code = spec["code"].upper()
    existing = db.query(Course).filter(Course.code == code).first()
    if existing is not None:
        return None

    course = Course(
        code=code,
        title=spec["title"],
        description=spec["description"],
        slug=spec["slug"],
        status="draft",
        pass_percent=spec.get("pass_percent", 70),
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
    db.add(
        FinalExam(
            course_id=course.id,
            title="Final Exam",
            pass_percent=spec.get("pass_percent", 70),
        )
    )
    _add_chapters(db, course, spec["chapters"])
    db.commit()
    db.refresh(course)
    return course


def seed_courses(db: Session) -> list[str]:
    """Create demo courses that are not yet in the database. Returns codes created."""
    created: list[str] = []
    for spec in COURSE_SPECS:
        course = ensure_course(db, spec)
        if course is not None:
            created.append(course.code)
    return created


def run() -> None:
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        created = seed_courses(db)
        if not created:
            print("All seed courses already exist.")
            return
        print(f"Created courses: {', '.join(created)}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
