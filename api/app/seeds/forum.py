"""Seed discussion forum categories and boards."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.models import ForumBoard, ForumCategory

FORUM_SEED: list[dict] = [
    {
        "slug": "all-students-forum",
        "title": "All Students Forum",
        "sort_order": 10,
        "boards": [
            {
                "slug": "general-questions",
                "title": "General Questions",
                "description": "Ask anything about student life, CAISBE, and how the forum works.",
                "member_can_start": True,
                "sort_order": 10,
            },
            {
                "slug": "introductions",
                "title": "Introductions",
                "description": "Say hello and tell the community who you are.",
                "member_can_start": True,
                "sort_order": 20,
            },
            {
                "slug": "announcements",
                "title": "Announcements",
                "description": "Official updates from CAISBE. New discussions are posted by staff.",
                "member_can_start": False,
                "sort_order": 30,
            },
        ],
    },
    {
        "slug": "academic-support",
        "title": "Academic Support",
        "sort_order": 20,
        "boards": [
            {
                "slug": "course-questions",
                "title": "Course Questions",
                "description": "Questions about course content, lessons, and how programs are structured.",
                "member_can_start": True,
                "sort_order": 10,
            },
            {
                "slug": "assignments-help",
                "title": "Assignments Help",
                "description": "Work through assignment requirements and share approaches with peers.",
                "member_can_start": True,
                "sort_order": 20,
            },
            {
                "slug": "exam-prep",
                "title": "Exam Prep",
                "description": "Study tips, practice questions, and exam timing.",
                "member_can_start": True,
                "sort_order": 30,
            },
            {
                "slug": "research-support",
                "title": "Research Support",
                "description": "Help with research topics, sources, and project design.",
                "member_can_start": True,
                "sort_order": 40,
            },
        ],
    },
    {
        "slug": "career-development",
        "title": "Career Development",
        "sort_order": 30,
        "boards": [
            {
                "slug": "internships-jobs",
                "title": "Internships & Jobs",
                "description": "Openings, applications, and workplace opportunities.",
                "member_can_start": True,
                "sort_order": 10,
            },
            {
                "slug": "resume-interviews",
                "title": "Resume & Interviews",
                "description": "Feedback on resumes, cover letters, and interview preparation.",
                "member_can_start": True,
                "sort_order": 20,
            },
            {
                "slug": "mentorship",
                "title": "Mentorship",
                "description": "Find a mentor or offer guidance to other members.",
                "member_can_start": True,
                "sort_order": 30,
            },
        ],
    },
    {
        "slug": "events",
        "title": "Events",
        "sort_order": 40,
        "boards": [
            {
                "slug": "events",
                "title": "Webinars and chapter activities",
                "description": "Discuss upcoming CAISBE events, webinars, and chapter activities.",
                "member_can_start": True,
                "sort_order": 10,
            },
        ],
    },
]


def seed_forum(db: Session) -> None:
    for category in FORUM_SEED:
        row = db.query(ForumCategory).filter(ForumCategory.slug == category["slug"]).first()
        if row is None:
            row = ForumCategory(
                slug=category["slug"],
                title=category["title"],
                sort_order=category["sort_order"],
            )
            db.add(row)
            db.flush()
        else:
            row.title = category["title"]
            row.sort_order = category["sort_order"]

        for board in category["boards"]:
            existing = db.query(ForumBoard).filter(ForumBoard.slug == board["slug"]).first()
            if existing is None:
                db.add(
                    ForumBoard(
                        category_id=row.id,
                        slug=board["slug"],
                        title=board["title"],
                        description=board["description"],
                        member_can_start=board["member_can_start"],
                        sort_order=board["sort_order"],
                    )
                )
            else:
                existing.category_id = row.id
                existing.title = board["title"]
                existing.description = board["description"]
                existing.member_can_start = board["member_can_start"]
                existing.sort_order = board["sort_order"]

    db.commit()
