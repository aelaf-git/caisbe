"""Idempotent FMC + PMC staging courses that exercise every LMS authoring feature."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
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
)

# Minimal valid files so portal/admin links work on the API upload disk.
_PNG_1X1 = bytes.fromhex(
    "89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c489"
    "0000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082"
)
_MIN_PDF = (
    b"%PDF-1.1\n"
    b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
    b"2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n"
    b"3 0 obj<</Type/Page/MediaBox[0 0 612 792]/Parent 2 0 R/Contents 4 0 R>>endobj\n"
    b"4 0 obj<</Length 44>>stream\n"
    b"BT /F1 12 Tf 72 720 Td (CAISBE seed assignment) Tj ET\n"
    b"endstream\nendobj\n"
    b"xref\n0 5\n0000000000 65535 f \n"
    b"trailer<</Size 5/Root 1 0 R>>\nstartxref\n0\n%%EOF\n"
)

COVER_NAME = "seed-fmc-pmc-cover.png"
ASSIGNMENT_NAME = "seed-fmc-pmc-assignment.pdf"
READING_NAME = "seed-fmc-pmc-reading.pdf"


def _write_placeholder(name: str, content: bytes) -> str:
    root = Path(settings.upload_dir)
    root.mkdir(parents=True, exist_ok=True)
    dest = root / name
    if not dest.exists() or dest.stat().st_size == 0:
        dest.write_bytes(content)
    return f"/api/uploads/{name}"


def _ensure_files() -> dict[str, str]:
    return {
        "cover": _write_placeholder(COVER_NAME, _PNG_1X1),
        "assignment": _write_placeholder(ASSIGNMENT_NAME, _MIN_PDF),
        "reading": _write_placeholder(READING_NAME, _MIN_PDF),
    }


def _add_choices(db: Session, question_id: int, choices: list[dict]) -> None:
    for index, choice in enumerate(choices):
        db.add(
            QuizChoice(
                question_id=question_id,
                text=choice["text"],
                is_correct=choice["correct"],
                sort_order=index,
            )
        )


def _add_quiz_questions(db: Session, quiz_id: int, questions: list[dict]) -> None:
    for index, item in enumerate(questions):
        question = QuizQuestion(quiz_id=quiz_id, prompt=item["prompt"], sort_order=index)
        db.add(question)
        db.flush()
        _add_choices(db, question.id, item["choices"])


def _add_exam_questions(db: Session, exam_id: int, questions: list[dict]) -> None:
    for index, item in enumerate(questions):
        question = QuizQuestion(final_exam_id=exam_id, prompt=item["prompt"], sort_order=index)
        db.add(question)
        db.flush()
        _add_choices(db, question.id, item["choices"])


def _mcq(prompt: str, correct: str, wrong: list[str]) -> dict:
    choices = [{"text": correct, "correct": True}]
    choices.extend({"text": text, "correct": False} for text in wrong)
    return {"prompt": prompt, "choices": choices}


def _chapter_quiz(db: Session, chapter: Chapter, title: str, questions: list[dict], sort_order: int) -> None:
    quiz = Quiz(title=title)
    db.add(quiz)
    db.flush()
    _add_quiz_questions(db, quiz.id, questions)
    db.add(
        ContentBlock(
            chapter_id=chapter.id,
            block_type="quiz",
            title=title,
            quiz_id=quiz.id,
            sort_order=sort_order,
        )
    )


def _chapter_assignment(
    db: Session,
    chapter: Chapter,
    title: str,
    file_url: str,
    sort_order: int,
) -> None:
    db.add(
        ContentBlock(
            chapter_id=chapter.id,
            block_type="assignment",
            title=title,
            url=file_url,
            label=f"{title}.pdf",
            sort_order=sort_order,
        )
    )


def _add_nested_media(
    db: Session,
    lesson_id: int,
    parent_id: int,
    files: dict[str, str],
    link_url: str,
    start_sort: int,
) -> None:
    media = [
        ("link", "Program page", link_url, "Open program overview"),
        ("image", "Course cover", files["cover"], "Cover image"),
        ("pdf", "Chapter reading", files["reading"], "Download reading"),
    ]
    for offset, (block_type, title, url, label) in enumerate(media):
        db.add(
            ContentBlock(
                lesson_id=lesson_id,
                parent_id=parent_id,
                block_type=block_type,
                title=title,
                url=url,
                label=label,
                sort_order=start_sort + offset,
            )
        )


def _add_topic(
    db: Session,
    chapter: Chapter,
    topic: dict,
    topic_index: int,
    files: dict[str, str],
    *,
    with_extras: bool,
    link_url: str,
) -> None:
    body = sanitize_html(topic["body"])
    lesson = Lesson(
        chapter_id=chapter.id,
        title=topic["title"],
        body=body,
        sort_order=topic_index,
    )
    db.add(lesson)
    db.flush()

    text = ContentBlock(
        lesson_id=lesson.id,
        block_type="text",
        title=None,
        body=body,
        sort_order=0,
    )
    db.add(text)
    db.flush()

    if with_extras:
        _add_nested_media(db, lesson.id, text.id, files, link_url, start_sort=0)
        subtopic = ContentBlock(
            lesson_id=lesson.id,
            parent_id=None,
            block_type="subtopic",
            title=topic.get("subtopic_title", "Practice note"),
            body=sanitize_html(topic.get("subtopic_body", "<p>Apply this topic in a real building context.</p>")),
            sort_order=1,
        )
        db.add(subtopic)
        db.flush()
        nested = ContentBlock(
            lesson_id=lesson.id,
            parent_id=subtopic.id,
            block_type="text",
            title=None,
            body=sanitize_html(
                topic.get(
                    "nested_note",
                    "<p>Document decisions, owners, and follow-up dates before closing the week.</p>",
                )
            ),
            sort_order=0,
        )
        db.add(nested)
        db.flush()
        db.add(
            ContentBlock(
                lesson_id=lesson.id,
                parent_id=nested.id,
                block_type="link",
                title="Learning formats",
                url="https://caisbe.org/professional-development/learning-formats",
                label="CAISBE learning formats",
                sort_order=0,
            )
        )


def _build_course(db: Session, spec: dict, files: dict[str, str]) -> Course:
    course = Course(
        code=spec["code"],
        title=spec["title"],
        description=spec["description"],
        slug=spec["slug"],
        status="published",
        cover_url=files["cover"],
        pass_percent=spec["pass_percent"],
    )
    db.add(course)
    db.flush()

    db.add(
        CertificateTemplate(
            course_id=course.id,
            title=spec["certificate_title"],
            body=spec["certificate_body"],
        )
    )
    exam = FinalExam(
        course_id=course.id,
        title=spec["exam_title"],
        pass_percent=spec["pass_percent"],
    )
    db.add(exam)
    db.flush()
    _add_exam_questions(db, exam.id, spec["exam_questions"])

    for chapter_index, chapter_data in enumerate(spec["chapters"]):
        chapter = Chapter(
            course_id=course.id,
            title=chapter_data["title"],
            sort_order=chapter_index,
        )
        db.add(chapter)
        db.flush()
        for topic_index, topic in enumerate(chapter_data["topics"]):
            _add_topic(
                db,
                chapter,
                topic,
                topic_index,
                files,
                with_extras=chapter_index == 0 and topic_index == 0,
                link_url=spec["program_url"],
            )
        _chapter_quiz(
            db,
            chapter,
            chapter_data["quiz_title"],
            chapter_data["quiz_questions"],
            sort_order=0,
        )
        _chapter_assignment(
            db,
            chapter,
            chapter_data["assignment_title"],
            files["assignment"],
            sort_order=1,
        )
    return course


FMC_SPEC = {
    "code": "FMC",
    "slug": "fmc",
    "title": "Facilities Management Certificate (FMC)",
    "description": (
        "This certificate provides foundational knowledge and practical skills for managing modern "
        "facilities. Participants learn how to oversee building operations, maintenance planning, "
        "space management, vendor coordination, and sustainability practices to ensure efficient, "
        "safe, and cost-effective facility performance."
    ),
    "pass_percent": 70,
    "program_url": "https://caisbe.org/professional-development/fmc",
    "certificate_title": "Facilities Management Certificate",
    "certificate_body": (
        "This certifies that {student_name} has successfully completed {course_title}, "
        "demonstrating competence in building operations, maintenance planning, space management, "
        "vendor coordination, and sustainability practices for modern facilities."
    ),
    "exam_title": "FMC Final Exam",
    "exam_questions": [
        _mcq(
            "What is the primary aim of facilities management in this certificate?",
            "Keep buildings efficient, safe, and cost-effective",
            [
                "Maximize short-term rent without operations planning",
                "Avoid vendor contracts whenever possible",
                "Defer maintenance until occupants complain",
            ],
        ),
        _mcq(
            "Which activity belongs to maintenance planning?",
            "Scheduling preventive work before assets fail",
            [
                "Setting lease clauses for new tenants",
                "Marketing vacant units on listing sites",
                "Preparing a property valuation model",
            ],
        ),
        _mcq(
            "Space management is mainly concerned with:",
            "How people and functions use floors, rooms, and circulation",
            [
                "Only the legal title of the land",
                "Interest rates on construction loans",
                "Social media branding for the landlord",
            ],
        ),
        _mcq(
            "Effective vendor coordination requires:",
            "Clear scopes, service levels, and performance reviews",
            [
                "Verbal instructions with no written scope",
                "Paying invoices before work is inspected",
                "Using a different contractor for every work order with no record",
            ],
        ),
        _mcq(
            "A practical sustainability action for FM teams is:",
            "Track energy and water use and reduce avoidable waste",
            [
                "Ignore utility bills if the building is occupied",
                "Disable meters to simplify reporting",
                "Replace all systems every year regardless of condition",
            ],
        ),
        _mcq(
            "Safe, cost-effective facility performance depends on:",
            "Balancing operations, people, assets, and compliance",
            [
                "Cutting all inspections to reduce cost",
                "Closing the helpdesk after the first month",
                "Treating occupant feedback as optional",
            ],
        ),
    ],
    "chapters": [
        {
            "title": "Building operations",
            "assignment_title": "Operations walkthrough worksheet",
            "quiz_title": "Quiz: Building operations",
            "quiz_questions": [
                _mcq(
                    "Day-to-day operations should prioritize:",
                    "Reliable services, safety, and documented procedures",
                    [
                        "Ad-hoc fixes with no logbook",
                        "Closing tickets without verification",
                        "Hiding outages from stakeholders",
                    ],
                ),
                _mcq(
                    "A useful operations KPI is:",
                    "Work-order response time and first-time fix rate",
                    ["Number of unread emails", "Office coffee spend", "Social-media likes"],
                ),
            ],
            "topics": [
                {
                    "title": "Overseeing modern facilities",
                    "body": (
                        "<h2>Operating the building as a system</h2>"
                        "<p>Facilities management keeps HVAC, lighting, vertical transport, security, "
                        "and cleaning working together so occupants can do their jobs safely.</p>"
                        "<ul><li>Define service hours and escalation paths.</li>"
                        "<li>Keep as-built drawings and equipment lists current.</li>"
                        "<li>Brief the helpdesk so requests are logged and closed with evidence.</li></ul>"
                    ),
                    "subtopic_title": "Shift handover",
                    "subtopic_body": (
                        "<p>Hand over open faults, contractor visits, and safety issues at every shift "
                        "change so nothing is lost between teams.</p>"
                    ),
                    "nested_note": (
                        "<p>Record who is on site, permits in force, and any isolation of plant.</p>"
                    ),
                },
                {
                    "title": "Service delivery and occupant care",
                    "body": (
                        "<h3>Occupant-facing operations</h3>"
                        "<p>Treat requests as service, not noise. Communicate outages, restore access, "
                        "and confirm the space is usable before closing the ticket.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Maintenance planning",
            "assignment_title": "Annual PPM calendar draft",
            "quiz_title": "Quiz: Maintenance planning",
            "quiz_questions": [
                _mcq(
                    "Preventive maintenance is intended to:",
                    "Reduce unplanned failures and extend asset life",
                    [
                        "Wait until failure to authorize any work",
                        "Replace every asset on a fixed 90-day cycle",
                        "Skip statutory inspections if the plant looks fine",
                    ],
                ),
                _mcq(
                    "A maintenance plan should include:",
                    "Asset criticality, frequencies, and responsible parties",
                    ["Only the original purchase invoice", "Tenant credit scores", "Broker commission rates"],
                ),
            ],
            "topics": [
                {
                    "title": "Planning preventive work",
                    "body": (
                        "<h2>From reactive to planned</h2>"
                        "<p>Use asset registers and manufacturer guidance to set inspection and service "
                        "intervals. Prioritize life-safety and business-critical plant.</p>"
                        "<ol><li>Identify statutory vs operational tasks.</li>"
                        "<li>Book access windows with occupants.</li>"
                        "<li>Store certificates and job sheets after each visit.</li></ol>"
                    ),
                },
                {
                    "title": "Corrective work and backlog",
                    "body": (
                        "<p>Rank defects by risk and impact. A visible backlog with dates is healthier "
                        "than hidden failures that surface as emergencies.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Space management and vendors",
            "assignment_title": "Vendor scorecard template",
            "quiz_title": "Quiz: Space and vendors",
            "quiz_questions": [
                _mcq(
                    "Space management helps organizations:",
                    "Match people and functions to the right rooms and density",
                    [
                        "Ignore fire-exit widths when adding desks",
                        "Lease unused roofs without checking structure",
                        "Remove wayfinding to save signage cost",
                    ],
                ),
                _mcq(
                    "Vendor coordination fails when:",
                    "Scopes and SLAs are unclear and unmeasured",
                    [
                        "Kick-off meetings are held before work starts",
                        "Invoices are checked against completed work",
                        "Permits and insurance are verified on arrival",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Space management",
                    "body": (
                        "<h2>Using space well</h2>"
                        "<p>Map occupancy, storage, and circulation. Changes to layout must respect "
                        "fire strategy, accessibility, and mechanical capacity.</p>"
                    ),
                },
                {
                    "title": "Vendor coordination",
                    "body": (
                        "<p>Issue clear scopes, confirm insurance and method statements, and review "
                        "performance against SLAs so contractors stay accountable.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Sustainability and performance",
            "assignment_title": "Utility baseline memo",
            "quiz_title": "Quiz: Sustainability practices",
            "quiz_questions": [
                _mcq(
                    "Sustainability in FM is practical when teams:",
                    "Measure use, fix waste, and report results",
                    [
                        "Assume green labels without checking operations",
                        "Disable meters to hide spikes",
                        "Run all plant 24/7 “just in case”",
                    ],
                ),
                _mcq(
                    "Cost-effective facility performance means:",
                    "Safe service at a justified whole-life cost",
                    [
                        "The cheapest bid regardless of risk",
                        "No inspections if the budget is tight",
                        "Ignoring energy waste because rent covers it",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Sustainability practices",
                    "body": (
                        "<h2>Efficient, safe, and responsible</h2>"
                        "<p>Track electricity, water, and waste. Simple controls—setpoints, schedules, "
                        "and leak response—often outperform expensive kit that is poorly operated.</p>"
                    ),
                },
                {
                    "title": "Reporting performance",
                    "body": (
                        "<p>Share a short monthly pack: incidents, overdue PPM, utilities, and open "
                        "risks so leadership can support the FM team.</p>"
                    ),
                },
            ],
        },
    ],
}

PMC_SPEC = {
    "code": "PMC",
    "slug": "pmc",
    "title": "Property Management Certificate (PMC)",
    "description": (
        "This program equips learners with essential skills in property operations, leasing, tenant "
        "relations, rent management, maintenance coordination, and legal compliance. Ideal for those "
        "managing residential, commercial, or mixed-use properties in rapidly growing real estate markets."
    ),
    "pass_percent": 75,
    "program_url": "https://caisbe.org/professional-development/pmc",
    "certificate_title": "Property Management Certificate",
    "certificate_body": (
        "This certifies that {student_name} has successfully completed {course_title}, "
        "demonstrating competence in property operations, leasing, tenant relations, rent management, "
        "maintenance coordination, and legal compliance across residential, commercial, and mixed-use assets."
    ),
    "exam_title": "PMC Final Exam",
    "exam_questions": [
        _mcq(
            "Property operations cover:",
            "Day-to-day running of the asset and common areas",
            [
                "Only the original construction drawings",
                "Equity waterfall models for investors",
                "National tax policy drafting",
            ],
        ),
        _mcq(
            "A sound leasing process should:",
            "Qualify applicants, document terms, and complete handover",
            [
                "Hand over keys before identity checks",
                "Change rent verbally each week",
                "Skip inventories to save time",
            ],
        ),
        _mcq(
            "Tenant relations improve when managers:",
            "Respond clearly, keep records, and treat people fairly",
            [
                "Ignore complaints until a lawyer writes",
                "Share one tenant’s data with another",
                "Close the office email without an after-hours path",
            ],
        ),
        _mcq(
            "Rent management includes:",
            "Invoicing, collections, and lawful handling of arrears",
            [
                "Charging fees that were never disclosed",
                "Mixing rent cash with personal accounts",
                "Stopping all maintenance until every tenant pays",
            ],
        ),
        _mcq(
            "Maintenance coordination in property management means:",
            "Logging requests and dispatching the right trade safely",
            [
                "Telling tenants to hire anyone they like with no record",
                "Entering homes without notice when it is convenient",
                "Never inspecting completed work",
            ],
        ),
        _mcq(
            "Legal compliance protects:",
            "Owners, occupants, and the manager’s licence to operate",
            [
                "Only marketing slogans on the hoarding",
                "Informal side deals that contradict the lease",
                "Skipping notices required by local law",
            ],
        ),
    ],
    "chapters": [
        {
            "title": "Property operations",
            "assignment_title": "Site operations checklist",
            "quiz_title": "Quiz: Property operations",
            "quiz_questions": [
                _mcq(
                    "Mixed-use operations should:",
                    "Separate residential, retail, and common-area rules clearly",
                    [
                        "Use one unlock code for every tenant forever",
                        "Store hazardous stock in escape stairs",
                        "Turn off lighting in shared corridors to save money",
                    ],
                ),
                _mcq(
                    "A daily operations walk typically checks:",
                    "Safety, cleanliness, access, and obvious defects",
                    ["Share prices", "Tenant social media", "Architect portfolios"],
                ),
            ],
            "topics": [
                {
                    "title": "Running the asset",
                    "body": (
                        "<h2>Operations across asset types</h2>"
                        "<p>Residential, commercial, and mixed-use properties share a need for safe "
                        "access, clean common areas, and reliable building services—even as tenant "
                        "rules differ.</p>"
                        "<ul><li>Open and close the site to the published hours.</li>"
                        "<li>Walk common areas and log defects the same day.</li>"
                        "<li>Keep emergency contacts visible and current.</li></ul>"
                    ),
                    "subtopic_title": "Rapidly growing markets",
                    "subtopic_body": (
                        "<p>High turnover and new supply demand tighter inventories, faster "
                        "onboarding, and clearer house rules.</p>"
                    ),
                    "nested_note": (
                        "<p>Standardize check-in packs so every new occupant gets the same safety "
                        "and payment information.</p>"
                    ),
                },
                {
                    "title": "Common areas and services",
                    "body": (
                        "<p>Treat lobbies, parking, waste rooms, and plant rooms as part of the "
                        "product. Poor common areas drive complaints even when units are fine.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Leasing and tenant relations",
            "assignment_title": "Tenant communication plan",
            "quiz_title": "Quiz: Leasing and relations",
            "quiz_questions": [
                _mcq(
                    "Fair tenant relations require:",
                    "Consistent processes and respectful communication",
                    [
                        "Different unpublished rules for friends of staff",
                        "Public shaming of late payers",
                        "Ignoring accessibility requests",
                    ],
                ),
                _mcq(
                    "Before keys are released, managers should:",
                    "Complete checks, sign the lease, and record the inventory",
                    [
                        "Accept cash with no receipt",
                        "Skip ID if the unit has been empty",
                        "Promise renovations that are not in writing",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Leasing practice",
                    "body": (
                        "<h2>From enquiry to handover</h2>"
                        "<p>Qualify use, screen as the law allows, explain fees, and document the "
                        "condition of the unit. A clean file prevents disputes later.</p>"
                    ),
                },
                {
                    "title": "Tenant relations",
                    "body": (
                        "<p>Acknowledge requests, set expectations for response times, and keep a "
                        "written trail. Good relations reduce vacancies and legal risk.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Rent management",
            "assignment_title": "Arrears workflow map",
            "quiz_title": "Quiz: Rent management",
            "quiz_questions": [
                _mcq(
                    "Rent processes should be:",
                    "Transparent, timely, and consistent with the lease",
                    [
                        "Changed informally after every phone call",
                        "Hidden from the owner’s statement",
                        "Collected in unverifiable cash only",
                    ],
                ),
                _mcq(
                    "Early arrears action is usually:",
                    "A polite reminder and a documented payment plan if needed",
                    [
                        "Changing the locks the next morning",
                        "Publishing the tenant’s name online",
                        "Stopping water without notice",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Invoicing and collections",
                    "body": (
                        "<h2>Rent as a controlled process</h2>"
                        "<p>Issue invoices on schedule, reconcile receipts, and escalate arrears "
                        "using the steps in the lease and local law.</p>"
                    ),
                },
                {
                    "title": "Reporting to owners",
                    "body": (
                        "<p>Owners need occupancy, rent collected vs due, and notable risks—not a "
                        "dump of every email.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Maintenance and legal compliance",
            "assignment_title": "Compliance calendar",
            "quiz_title": "Quiz: Maintenance and compliance",
            "quiz_questions": [
                _mcq(
                    "Maintenance coordination should:",
                    "Log the request, gain access lawfully, and confirm the fix",
                    [
                        "Enter units unannounced for convenience",
                        "Leave tools in corridors overnight",
                        "Close tickets from the contractor’s text alone",
                    ],
                ),
                _mcq(
                    "Legal compliance includes:",
                    "Notices, deposits, safety duties, and data handling",
                    [
                        "Only the marketing brochure",
                        "Whatever the loudest tenant demands",
                        "Skipping licences if the building is new",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Maintenance coordination",
                    "body": (
                        "<h2>From request to close-out</h2>"
                        "<p>Triage urgency, book access with notice, dispatch competent trades, and "
                        "photograph completed work for the file.</p>"
                    ),
                },
                {
                    "title": "Legal compliance",
                    "body": (
                        "<p>Know the rules that apply to deposits, notices, habitability, and "
                        "privacy. When unsure, pause and get advice rather than inventing a shortcut.</p>"
                    ),
                },
            ],
        },
    ],
}

SPECS = [FMC_SPEC, PMC_SPEC]


def ensure_course(db: Session, spec: dict, files: dict[str, str]) -> Course | None:
    existing = db.query(Course).filter(Course.code == spec["code"]).first()
    if existing is not None:
        return None
    course = _build_course(db, spec, files)
    db.commit()
    db.refresh(course)
    return course


def seed_fmc_pmc(db: Session) -> list[str]:
    files = _ensure_files()
    created: list[str] = []
    for spec in SPECS:
        course = ensure_course(db, spec, files)
        if course is not None:
            created.append(course.code)
    return created


def run() -> None:
    from app.db import SessionLocal

    db = SessionLocal()
    try:
        created = seed_fmc_pmc(db)
        if not created:
            print("FMC and PMC already exist.")
            return
        print(f"Created courses: {', '.join(created)}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
