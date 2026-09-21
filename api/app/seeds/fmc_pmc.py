"""Idempotent landing-page certificate programs that exercise every LMS authoring feature."""

from __future__ import annotations

from pathlib import Path

from sqlalchemy.orm import Session

from app.config import settings
from app.security.html_sanitize import sanitize_html
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

CHMC_SPEC = {
    "code": "CHMC",
    "slug": "chmc",
    "title": "Condominium/Cooperative Housing Management Certificate (CHMC)",
    "description": (
        "This certificate focuses on the unique governance, financial management, maintenance, and "
        "community leadership skills needed to manage condominium and cooperative housing developments. "
        "It covers owner/tenant coordination, board relations, budgeting, and conflict resolution."
    ),
    "pass_percent": 70,
    "program_url": "https://caisbe.org/professional-development/chmc",
    "certificate_title": "Condominium/Cooperative Housing Management Certificate",
    "certificate_body": (
        "This certifies that {student_name} has successfully completed {course_title}, "
        "demonstrating competence in condominium and cooperative governance, board relations, "
        "community budgeting, maintenance of common property, and conflict resolution."
    ),
    "exam_title": "CHMC Final Exam",
    "exam_questions": [
        _mcq(
            "A condominium manager primarily serves:",
            "The corporation or association and its governing documents",
            [
                "Only the loudest owner on the floor",
                "A single investor with no board mandate",
                "Contractors who want extra work orders",
            ],
        ),
        _mcq(
            "Board relations work best when the manager:",
            "Prepares clear packs, records decisions, and stays within delegated authority",
            [
                "Makes capital decisions without informing directors",
                "Shares confidential owner files in the lobby",
                "Cancels meetings whenever minutes are overdue",
            ],
        ),
        _mcq(
            "A reserve or contingency fund is used to:",
            "Plan for major common-element repairs over time",
            [
                "Pay the manager’s personal expenses",
                "Cover one owner’s interior renovation",
                "Hide operating deficits from the AGM",
            ],
        ),
        _mcq(
            "Owner and occupant coordination should:",
            "Use published rules, notices, and a consistent request process",
            [
                "Apply unpublished exceptions for friends of the board",
                "Ignore access needs for people with disabilities",
                "Post unpaid account details on the notice board",
            ],
        ),
        _mcq(
            "Conflict resolution in a community starts with:",
            "Listening, documenting facts, and applying the by-laws fairly",
            [
                "Immediate lockouts without process",
                "Public shaming on social media",
                "Ignoring disputes until they become lawsuits",
            ],
        ),
        _mcq(
            "Common-element maintenance is the corporation’s duty because:",
            "Shared assets protect safety, value, and insurance conditions",
            [
                "Each owner should wait until their unit is affected",
                "Boards can skip statutory inspections if cash is tight",
                "Contractors may work without insurance in common halls",
            ],
        ),
    ],
    "chapters": [
        {
            "title": "Governance and community leadership",
            "assignment_title": "Governing-document summary",
            "quiz_title": "Quiz: Governance",
            "quiz_questions": [
                _mcq(
                    "The hierarchy of community rules typically starts with:",
                    "Statute, declaration/bylaws, then house rules",
                    [
                        "Whatever an owner emails after midnight",
                        "The contractor’s invoice terms",
                        "Unwritten customs from the first occupancy",
                    ],
                ),
                _mcq(
                    "Good community leadership means:",
                    "Transparent process and equal application of the rules",
                    [
                        "Favouring directors’ units in every work order",
                        "Hiding reserve shortfalls from owners",
                        "Skipping AGMs to avoid difficult questions",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "How condominiums and co-ops are governed",
                    "body": (
                        "<h2>Corporations, co-ops, and common property</h2>"
                        "<p>Managers work for a legal entity that owns or controls shared parts of "
                        "the building. Units or shares sit alongside common elements that everyone "
                        "depends on.</p>"
                        "<ul><li>Know who votes, who occupies, and who pays.</li>"
                        "<li>Keep the declaration, by-laws, and rules accessible.</li>"
                        "<li>Record board resolutions so staff can apply them consistently.</li></ul>"
                    ),
                    "subtopic_title": "Delegated authority",
                    "subtopic_body": (
                        "<p>The board sets policy; the manager executes within a written mandate "
                        "for spending, notices, and contractor appointment.</p>"
                    ),
                    "nested_note": (
                        "<p>Escalate items that change common property, insurance, or owner rights "
                        "instead of deciding them alone.</p>"
                    ),
                },
                {
                    "title": "Community leadership in practice",
                    "body": (
                        "<p>Leadership is visible in how meetings run, how newcomers are oriented, "
                        "and whether rules feel fair. Quiet competence reduces factional conflict.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Board relations and owner coordination",
            "assignment_title": "Board meeting pack outline",
            "quiz_title": "Quiz: Board and owners",
            "quiz_questions": [
                _mcq(
                    "A useful board pack includes:",
                    "Finance snapshot, work orders, risks, and decisions needed",
                    [
                        "Every email received that month, unsorted",
                        "Personal comments about individual owners",
                        "No figures because “it will be discussed live”",
                    ],
                ),
                _mcq(
                    "Owner notices should be:",
                    "Timely, factual, and consistent with the governing documents",
                    [
                        "Posted only in a private chat of selected residents",
                        "Written to embarrass a named occupant",
                        "Delayed until after the work is finished, always",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Working with the board",
                    "body": (
                        "<h2>Advice without taking over</h2>"
                        "<p>Prepare options, costs, and risks. Record the decision. Do not surprise "
                        "directors with faits accomplis on capital work.</p>"
                    ),
                },
                {
                    "title": "Owner and occupant coordination",
                    "body": (
                        "<p>Use one request channel, publish quiet hours and move-in rules, and "
                        "give lawful notice before entering units for common-element work.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Financial management and budgeting",
            "assignment_title": "Operating vs reserve budget sketch",
            "quiz_title": "Quiz: Community finance",
            "quiz_questions": [
                _mcq(
                    "Operating budgets usually fund:",
                    "Day-to-day services, utilities, and routine contracts",
                    [
                        "A complete roof replacement with no reserve study",
                        "One owner’s kitchen remodel",
                        "Unapproved loans to directors",
                    ],
                ),
                _mcq(
                    "A special assessment is a last resort when:",
                    "Planned reserves and operating funds cannot cover a necessary cost",
                    [
                        "The board wants a surplus for unspecified use",
                        "A contractor asks for a larger deposit",
                        "Owners dislike the published fee schedule",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Budgets owners can follow",
                    "body": (
                        "<h2>Operating and long-term funds</h2>"
                        "<p>Separate day-to-day costs from major repair savings. Explain variances "
                        "in plain language at the AGM.</p>"
                    ),
                },
                {
                    "title": "Collections and reporting",
                    "body": (
                        "<p>Apply arrears procedures in the documents. Report aged receivables "
                        "without exposing unnecessary personal detail in public minutes.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Maintenance and conflict resolution",
            "assignment_title": "Dispute intake form",
            "quiz_title": "Quiz: Maintenance and disputes",
            "quiz_questions": [
                _mcq(
                    "Common-element defects should be:",
                    "Logged, risk-ranked, and closed with evidence",
                    [
                        "Left until several owners complain in writing",
                        "Fixed only in directors’ stacks",
                        "Hidden from the insurance broker",
                    ],
                ),
                _mcq(
                    "When neighbours conflict, the manager should:",
                    "Stay impartial, document, and use the rules and mediation path",
                    [
                        "Take sides based on who pays fees first",
                        "Publish both parties’ names in the newsletter",
                        "Refuse to record the complaint at all",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Maintaining shared assets",
                    "body": (
                        "<h2>Life safety and fabric</h2>"
                        "<p>Fire systems, roofs, elevators, and waterproofing protect everyone. "
                        "Plan access and communicate shutdowns early.</p>"
                    ),
                },
                {
                    "title": "Conflict resolution",
                    "body": (
                        "<p>Separate personality clashes from genuine rule breaches. Offer a "
                        "written process before legal escalation.</p>"
                    ),
                },
            ],
        },
    ],
}

HSC_SPEC = {
    "code": "HSC",
    "slug": "hsc",
    "title": "Health & Safety Certificate for FM Professionals (HSC)",
    "description": (
        "Designed for facility and property management professionals, this certificate covers "
        "workplace safety standards, risk assessment, emergency preparedness, hazard control, "
        "and compliance with health and safety regulations. Graduates gain the skills to create "
        "safe and compliant building environments."
    ),
    "pass_percent": 70,
    "program_url": "https://caisbe.org/professional-development/hsc",
    "certificate_title": "Health & Safety Certificate for FM Professionals",
    "certificate_body": (
        "This certifies that {student_name} has successfully completed {course_title}, "
        "demonstrating competence in workplace safety standards, risk assessment, emergency "
        "preparedness, hazard control, and regulatory compliance for building environments."
    ),
    "exam_title": "HSC Final Exam",
    "exam_questions": [
        _mcq(
            "The main purpose of FM health and safety is to:",
            "Prevent harm to people while keeping the building usable and compliant",
            [
                "Eliminate all paperwork even if risks remain",
                "Transfer every duty to occupants with no site controls",
                "Ignore contractors because they are not employees",
            ],
        ),
        _mcq(
            "A suitable risk assessment:",
            "Identifies hazards, who might be harmed, and how risk is controlled",
            [
                "Is a poster with no review date",
                "Copies another site without a walk-round",
                "Is filed once and never updated after change of use",
            ],
        ),
        _mcq(
            "Emergency preparedness includes:",
            "Roles, routes, assembly, and practised response",
            [
                "Locked fire doors “to improve security”",
                "Unknown alarm tones with no occupant briefing",
                "Storing combustibles in protected stairwells",
            ],
        ),
        _mcq(
            "Hazard control should prefer:",
            "Elimination or engineering controls before relying only on PPE",
            [
                "Telling people to “be careful” as the only measure",
                "PPE with no training or replacement stock",
                "Disabling guards so plant is easier to clean",
            ],
        ),
        _mcq(
            "Permit-to-work is used when:",
            "Higher-risk tasks need isolation, competence, and sign-off",
            [
                "Any email request automatically authorizes hot work",
                "Visitors walk plant rooms unescorted",
                "Roof access is left permanently unlocked",
            ],
        ),
        _mcq(
            "Compliance evidence for inspectors typically includes:",
            "Training records, inspections, incidents, and action close-out",
            [
                "Verbal assurances with no dates",
                "Deleted CCTV and shredded accident logs",
                "Unsigned risk assessments stored off site only",
            ],
        ),
    ],
    "chapters": [
        {
            "title": "Workplace safety standards",
            "assignment_title": "Site safety briefing card",
            "quiz_title": "Quiz: Safety standards",
            "quiz_questions": [
                _mcq(
                    "A positive safety culture in FM means:",
                    "People report hazards without fear and actions are closed",
                    [
                        "Blaming the last person who touched the plant",
                        "Hiding near-misses to protect the KPI",
                        "Skipping inductions for regular contractors",
                    ],
                ),
                _mcq(
                    "Occupiers, employers, and contractors share duties when:",
                    "Their activities overlap in the same workplace",
                    [
                        "Only the landlord can ever be responsible",
                        "Only the tenant can ever be responsible",
                        "Nobody is responsible in common areas",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Standards that apply to buildings",
                    "body": (
                        "<h2>People, plant, and place</h2>"
                        "<p>FM teams implement duties for employees, visitors, and contractors. "
                        "Know the applicable workplace and building regulations for your jurisdiction "
                        "and keep a simple legal register.</p>"
                        "<ul><li>Define who controls which spaces.</li>"
                        "<li>Induct everyone who works on site.</li>"
                        "<li>Keep statutory inspections visible and in date.</li></ul>"
                    ),
                    "subtopic_title": "Competence",
                    "subtopic_body": (
                        "<p>Assign tasks only to people trained for the risk—ladders, electrics, "
                        "chemicals, and confined spaces are not casual jobs.</p>"
                    ),
                    "nested_note": (
                        "<p>Record names, dates, and refresher due dates rather than relying on memory.</p>"
                    ),
                },
                {
                    "title": "Roles of the FM professional",
                    "body": (
                        "<p>You may not be the duty holder, but you often coordinate controls, "
                        "contractors, and evidence. Escalate when resources do not match the risk.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Risk assessment and hazard control",
            "assignment_title": "Task risk assessment",
            "quiz_title": "Quiz: Risk and hazards",
            "quiz_questions": [
                _mcq(
                    "After identifying a hazard, the next step is usually:",
                    "Evaluate risk and choose proportionate controls",
                    [
                        "Write a slogan and stop there",
                        "Increase inspections with no change to the task",
                        "Wait for an injury before acting",
                    ],
                ),
                _mcq(
                    "Hierarchy of control puts last:",
                    "Personal protective equipment used alone",
                    [
                        "Eliminating the hazard",
                        "Isolating people from the hazard",
                        "Engineering a guard or extraction",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Assessing workplace risk",
                    "body": (
                        "<h2>Walk the site, not just the policy</h2>"
                        "<p>Include plant rooms, roofs, loading bays, and after-hours work. Involve "
                        "the people who do the task.</p>"
                    ),
                },
                {
                    "title": "Controlling hazards",
                    "body": (
                        "<p>Fix lighting, housekeeping, machine guarding, chemical storage, and "
                        "traffic routes. Reassess when layout or occupancy changes.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Emergency preparedness",
            "assignment_title": "Evacuation role matrix",
            "quiz_title": "Quiz: Emergencies",
            "quiz_questions": [
                _mcq(
                    "Fire routes must remain:",
                    "Available, signed, and free of storage",
                    [
                        "Used as extra storage for events",
                        "Locked from the inside without override",
                        "Unlit to save energy overnight",
                    ],
                ),
                _mcq(
                    "After an incident, teams should:",
                    "Make the area safe, care for people, then investigate",
                    [
                        "Clean the scene before any photos",
                        "Blame an individual in the first email",
                        "Turn off alarms and reopen immediately always",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Plans people can actually use",
                    "body": (
                        "<h2>Fire, medical, spill, and security</h2>"
                        "<p>Keep plans short, practised, and matched to the building. Wardens need "
                        "radios or a fallback if phones fail.</p>"
                    ),
                },
                {
                    "title": "Drills and business continuity",
                    "body": (
                        "<p>Drills find blocked exits and unclear assembly points. Capture lessons "
                        "and close them like any other defect.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Compliance and safe environments",
            "assignment_title": "Statutory inspection tracker",
            "quiz_title": "Quiz: Compliance",
            "quiz_questions": [
                _mcq(
                    "A compliant building environment is one where:",
                    "Controls match the law and are evidenced in operation",
                    [
                        "Certificates exist but plant is never tested",
                        "Only the reception desk has a first-aid kit",
                        "Contractors bring unknown chemicals unlabeled",
                    ],
                ),
                _mcq(
                    "Contractor control includes:",
                    "Competence checks, induction, and monitoring on site",
                    [
                        "Assuming a logo on a van is enough",
                        "Leaving keys in an unattended box",
                        "No method statement for hot work",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Regulations in daily FM",
                    "body": (
                        "<h2>Inspection, asbestos, legionella, lifting, and electrics</h2>"
                        "<p>Map each duty to a person and a calendar. Overdue certificates are "
                        "operational risks, not filing issues.</p>"
                    ),
                },
                {
                    "title": "Creating a safe building",
                    "body": (
                        "<p>Combine hardware, procedures, and behaviour: lighting, cameras where "
                        "lawful, helpdesk logging, and visible leadership on site walks.</p>"
                    ),
                },
            ],
        },
    ],
}

CEEBM_SPEC = {
    "code": "CEEBM",
    "slug": "ceebm",
    "title": "Certificate in Energy Efficiency & Building Energy Management (CEEBM)",
    "description": (
        "Participants learn practical strategies for reducing building energy consumption through "
        "audits, energy monitoring, HVAC optimization, lighting upgrades, and sustainable design "
        "principles. The program emphasizes cost-effective approaches suitable for developing and "
        "advanced markets."
    ),
    "pass_percent": 70,
    "program_url": "https://caisbe.org/professional-development/ceebm",
    "certificate_title": "Certificate in Energy Efficiency & Building Energy Management",
    "certificate_body": (
        "This certifies that {student_name} has successfully completed {course_title}, "
        "demonstrating competence in energy audits, monitoring, HVAC and lighting optimisation, "
        "and cost-effective efficiency measures for buildings."
    ),
    "exam_title": "CEEBM Final Exam",
    "exam_questions": [
        _mcq(
            "The first step in managing building energy is usually:",
            "Measure use, find waste, then target cost-effective fixes",
            [
                "Replace every system before reading a meter",
                "Turn off ventilation permanently to save power",
                "Ignore occupancy patterns because the bill is paid centrally",
            ],
        ),
        _mcq(
            "An energy audit should:",
            "Walk the building, review bills, and list prioritized actions",
            [
                "Copy a generic checklist with no site visit",
                "Recommend only the most expensive kit",
                "Skip interviews with operators and occupants",
            ],
        ),
        _mcq(
            "HVAC optimization often starts with:",
            "Schedules, setpoints, filters, and controls that match occupancy",
            [
                "Running plant 24/7 to avoid complaints",
                "Blocking outdoor-air dampers shut",
                "Ignoring overlapping heating and cooling",
            ],
        ),
        _mcq(
            "Lighting upgrades save energy when they:",
            "Use efficient sources, controls, and maintained illuminance",
            [
                "Remove all night lighting from escape routes",
                "Over-light empty floors “for prestige”",
                "Disable sensors because they were once noisy",
            ],
        ),
        _mcq(
            "Monitoring is useful when data:",
            "Is compared to a baseline and acted on",
            [
                "Sits in a dashboard nobody reviews",
                "Is collected at the wrong interval for the question",
                "Is estimated without ever reading a meter",
            ],
        ),
        _mcq(
            "Cost-effective efficiency in mixed markets means:",
            "Low-cost operational fixes first, then justified capital",
            [
                "Only imported technology regardless of skills to maintain it",
                "No training for operators after a retrofit",
                "Cutting maintenance to fund a showcase project",
            ],
        ),
    ],
    "chapters": [
        {
            "title": "Energy use and audits",
            "assignment_title": "Utility baseline worksheet",
            "quiz_title": "Quiz: Audits",
            "quiz_questions": [
                _mcq(
                    "A baseline lets you:",
                    "Judge whether a change actually saved energy",
                    [
                        "Skip measuring after a retrofit",
                        "Blame weather for every increase without data",
                        "Hide occupancy growth in the narrative",
                    ],
                ),
                _mcq(
                    "Walk-round audits often find:",
                    "Simultaneous heating and cooling, leaks, and always-on loads",
                    [
                        "That meters never need calibration",
                        "That empty floors need full design lighting 24/7",
                        "That insulation is irrelevant in hot climates",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "How buildings consume energy",
                    "body": (
                        "<h2>End uses and drivers</h2>"
                        "<p>Cooling, heating, ventilation, lighting, plug loads, and hot water "
                        "respond to climate, hours of use, and control quality—not only the nameplate "
                        "efficiency of equipment.</p>"
                        "<ul><li>Map meters to wings or tenants where possible.</li>"
                        "<li>Note operating hours versus occupied hours.</li>"
                        "<li>Photograph obvious waste for the action list.</li></ul>"
                    ),
                    "subtopic_title": "Bills and degree days",
                    "subtopic_body": (
                        "<p>Normalize for weather and occupancy before claiming a project “failed.”</p>"
                    ),
                    "nested_note": (
                        "<p>Keep a simple tracker: kWh, fuel, water, and cost per month.</p>"
                    ),
                },
                {
                    "title": "Practical energy audits",
                    "body": (
                        "<p>Combine utility analysis with a structured walk. Rank actions by cost, "
                        "saving, disruption, and skills available to maintain them.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Monitoring and reporting",
            "assignment_title": "Monthly energy pack outline",
            "quiz_title": "Quiz: Monitoring",
            "quiz_questions": [
                _mcq(
                    "Submetering helps when:",
                    "You need to see which system or tenant is driving use",
                    [
                        "The main incoming meter is already unused",
                        "Nobody will look at the extra data",
                        "You intend to estimate all values anyway",
                    ],
                ),
                _mcq(
                    "A useful energy KPI is:",
                    "Energy per square metre or per occupied hour, tracked over time",
                    ["Number of green posters printed", "Staff coffee consumption", "Social-media followers"],
                ),
            ],
            "topics": [
                {
                    "title": "Energy monitoring",
                    "body": (
                        "<h2>From meters to decisions</h2>"
                        "<p>Interval data finds night-time base load. Alarms on unexpected spikes "
                        "beat annual surprise bills.</p>"
                    ),
                },
                {
                    "title": "Reporting that operators use",
                    "body": (
                        "<p>Show trend, exception, and one recommended action. Avoid dumping raw "
                        "trend logs on executives.</p>"
                    ),
                },
            ],
        },
        {
            "title": "HVAC and lighting",
            "assignment_title": "HVAC schedule review",
            "quiz_title": "Quiz: HVAC and lighting",
            "quiz_questions": [
                _mcq(
                    "Filter and coil care matters because:",
                    "Dirty plant uses more energy and delivers worse comfort",
                    [
                        "Dust improves heat transfer",
                        "Blocked filters protect the compressor forever",
                        "Maintenance can be skipped if the space feels cool",
                    ],
                ),
                _mcq(
                    "Daylight and occupancy controls should:",
                    "Dim or switch off when light or people are not needed",
                    [
                        "Be overridden permanently on day one",
                        "Leave perimeter lights at full output at noon",
                        "Ignore task lighting needs entirely",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "HVAC optimization",
                    "body": (
                        "<h2>Comfort without waste</h2>"
                        "<p>Check deadbands, night setback, economizer operation, and whether "
                        "terminals fight each other. Train operators after any controls change.</p>"
                    ),
                },
                {
                    "title": "Lighting upgrades",
                    "body": (
                        "<p>LED retrofits pay when hours are long and controls are kept. Maintain "
                        "emergency lighting as a safety system, not an energy afterthought.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Sustainable design and cost-effective delivery",
            "assignment_title": "Measure-and-verify mini plan",
            "quiz_title": "Quiz: Delivery",
            "quiz_questions": [
                _mcq(
                    "Envelope and shading reduce loads by:",
                    "Limiting unwanted heat gain or loss before plant sizes up",
                    [
                        "Replacing windows every year regardless of condition",
                        "Painting glass black to “block sun” in offices",
                        "Sealing trickle vents that provide required air",
                    ],
                ),
                _mcq(
                    "A project is cost-effective when:",
                    "Savings, maintenance skill, and disruption justify the spend",
                    [
                        "It wins an award even if operators cannot run it",
                        "It is the first brochure a vendor handed over",
                        "It cuts statutory ventilation to save kilowatts",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Sustainable design principles",
                    "body": (
                        "<h2>Fabric, orientation, and systems</h2>"
                        "<p>Passive measures lower loads. Specify equipment that local technicians "
                        "can service, especially in developing markets.</p>"
                    ),
                },
                {
                    "title": "Delivering savings that last",
                    "body": (
                        "<p>Commission, train, and verify. A retrofit without handover becomes "
                        "the next energy problem.</p>"
                    ),
                },
            ],
        },
    ],
}

RIPVC_SPEC = {
    "code": "RIPVC",
    "slug": "ripvc",
    "title": "Real Estate Investment & Property Valuation Certificate (RIPVC)",
    "description": (
        "This certificate introduces learners to investment analysis, valuation techniques, market "
        "assessment, and financial modeling for real estate assets. Participants gain skills in "
        "estimating property value, analyzing risk, and evaluating investment opportunities in "
        "emerging and mature property markets."
    ),
    "pass_percent": 70,
    "program_url": "https://caisbe.org/professional-development/ripvc",
    "certificate_title": "Real Estate Investment & Property Valuation Certificate",
    "certificate_body": (
        "This certifies that {student_name} has successfully completed {course_title}, "
        "demonstrating competence in investment analysis, valuation techniques, market assessment, "
        "and financial modelling for real estate assets."
    ),
    "exam_title": "RIPVC Final Exam",
    "exam_questions": [
        _mcq(
            "Market value is best described as:",
            "An estimated price between willing parties in an open market",
            [
                "Whatever the owner hopes to achieve",
                "Replacement cost with no market evidence",
                "Last year’s asking price regardless of condition",
            ],
        ),
        _mcq(
            "Investment analysis should include:",
            "Income, costs, timing, financing, and risk",
            [
                "Only the headline yield on a brochure",
                "Ignoring vacancy because the area “feels busy”",
                "Assuming rents never need incentives",
            ],
        ),
        _mcq(
            "The income approach to value typically uses:",
            "Stabilized income capitalized or discounted at an appropriate rate",
            [
                "Comparable sales only, even for unique income assets",
                "The original construction invoice inflated by CPI",
                "Social-media sentiment with no cash-flow model",
            ],
        ),
        _mcq(
            "Market assessment looks at:",
            "Supply, demand, occupier strength, and competing stock",
            [
                "A single listing with no context",
                "National GDP only",
                "The architect’s awards",
            ],
        ),
        _mcq(
            "A simple risk check for an investment is:",
            "What happens to returns if rent, vacancy, or rates move",
            [
                "Assuming the base case is certain",
                "Hiding leverage from the investment committee",
                "Using one optimistic rent forever",
            ],
        ),
        _mcq(
            "Emerging and mature markets differ because:",
            "Data quality, liquidity, and legal process affect risk and discount rates",
            [
                "Valuation theory does not apply outside capital cities",
                "Title and planning risk can be ignored if yields look high",
                "Currency and political risk never affect property",
            ],
        ),
    ],
    "chapters": [
        {
            "title": "Markets and investment basics",
            "assignment_title": "Market snapshot memo",
            "quiz_title": "Quiz: Markets",
            "quiz_questions": [
                _mcq(
                    "Occupier demand is important because:",
                    "It underpins rent, vacancy, and the durability of income",
                    [
                        "Investors never care who uses the building",
                        "Empty buildings always sell faster",
                        "Planning consent replaces the need for tenants",
                    ],
                ),
                _mcq(
                    "Liquidity in a property market means:",
                    "How readily similar assets can be bought or sold",
                    [
                        "How much water the building uses",
                        "Whether the asset has a swimming pool",
                        "The thickness of the valuation report",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "How property markets work",
                    "body": (
                        "<h2>Users, investors, and development</h2>"
                        "<p>Rents come from occupiers. Capital values also reflect interest rates, "
                        "risk, and the volume of competing stock.</p>"
                        "<ul><li>Separate owner-occupier and investment demand.</li>"
                        "<li>Note planning and infrastructure that change supply.</li>"
                        "<li>Record data sources and their limits.</li></ul>"
                    ),
                    "subtopic_title": "Emerging vs mature markets",
                    "subtopic_body": (
                        "<p>Thin comparable evidence and slower legal processes usually mean wider "
                        "value ranges and more due diligence.</p>"
                    ),
                    "nested_note": (
                        "<p>State assumptions explicitly; do not dress a guesstimate as a precise NAV.</p>"
                    ),
                },
                {
                    "title": "Investment objectives",
                    "body": (
                        "<p>Income, growth, and development profit have different risk profiles. "
                        "Match the asset to the investor’s time horizon and leverage appetite.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Valuation techniques",
            "assignment_title": "Three-approach comparison table",
            "quiz_title": "Quiz: Valuation",
            "quiz_questions": [
                _mcq(
                    "The sales comparison approach relies on:",
                    "Adjusting evidence from similar transacted properties",
                    [
                        "Inventing a price with no evidence",
                        "Using asking prices as if they were closed sales",
                        "Ignoring differences in size, location, and condition",
                    ],
                ),
                _mcq(
                    "Cost approach is most useful when:",
                    "The asset is specialized and market sales are scarce",
                    [
                        "There is a deep market of identical buildings",
                        "You want to avoid inspecting the property",
                        "Land value is unknown and left at zero always",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Approaches to value",
                    "body": (
                        "<h2>Income, sales, and cost</h2>"
                        "<p>Reconcile methods rather than averaging blindly. Explain which evidence "
                        "is strongest for this asset.</p>"
                    ),
                },
                {
                    "title": "Inspection and information",
                    "body": (
                        "<p>Condition, tenure, lettings, and legal constraints change value. A "
                        "desktop number without caveats can mislead a buyer.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Financial modelling",
            "assignment_title": "Simple cash-flow sketch",
            "quiz_title": "Quiz: Modelling",
            "quiz_questions": [
                _mcq(
                    "Net operating income is roughly:",
                    "Effective rent less operating expenses (before debt)",
                    [
                        "Gross rent with no vacancy or costs",
                        "Profit after the owner’s income tax only",
                        "Construction cost divided by yield",
                    ],
                ),
                _mcq(
                    "Discounted cash flow is sensitive to:",
                    "Timing of cash flows and the discount rate chosen",
                    [
                        "The font used in the spreadsheet",
                        "Whether the file is stored as PDF",
                        "The number of charts printed in colour",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Building a transparent model",
                    "body": (
                        "<h2>Assumptions on one sheet</h2>"
                        "<p>Show vacancy, incentives, opex, capex, and exit. Others should be able "
                        "to audit the logic without hidden cells.</p>"
                    ),
                },
                {
                    "title": "Debt and returns",
                    "body": (
                        "<p>Leverage can raise equity IRR and also raise the chance of distress. "
                        "Report both geared and ungeared views.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Risk and investment decisions",
            "assignment_title": "Downside scenario note",
            "quiz_title": "Quiz: Risk",
            "quiz_questions": [
                _mcq(
                    "A prudent investment memo includes:",
                    "Base, downside, and what would kill the thesis",
                    [
                        "Only the marketing render",
                        "A single IRR with no sensitivities",
                        "Unverified rumours as “local knowledge” only",
                    ],
                ),
                _mcq(
                    "Due diligence should cover:",
                    "Title, tenancy, technical, and market evidence",
                    [
                        "The asking brochure alone",
                        "A site photo from a search engine",
                        "Verbal tenant promises with no lease",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Analyzing risk",
                    "body": (
                        "<h2>Market, asset, and execution risk</h2>"
                        "<p>Stress vacancy, rent-free, capex overruns, and delayed exits. In "
                        "emerging markets, add legal and currency scenarios.</p>"
                    ),
                },
                {
                    "title": "Making the recommendation",
                    "body": (
                        "<p>State buy, hold, or pass with the few facts that would change your "
                        "mind. Valuation is an opinion supported by evidence, not a guarantee.</p>"
                    ),
                },
            ],
        },
    ],
}

SRET_SPEC = {
    "code": "SRET",
    "slug": "sret",
    "title": "Certificate in Smart Real Estate Technologies",
    "description": (
        "A forward-looking program covering digital tools that are transforming real estate, "
        "including smart building systems, IoT sensors, building automation, AI-powered valuation "
        "tools, mobile property management platforms, and blockchain-based land registration solutions."
    ),
    "pass_percent": 70,
    "program_url": "https://caisbe.org/professional-development/sret",
    "certificate_title": "Certificate in Smart Real Estate Technologies",
    "certificate_body": (
        "This certifies that {student_name} has successfully completed {course_title}, "
        "demonstrating competence in smart building systems, IoT and automation, digital property "
        "operations, and emerging tools such as AI valuation and blockchain land records."
    ),
    "exam_title": "SRET Final Exam",
    "exam_questions": [
        _mcq(
            "A smart building is useful when technology:",
            "Improves operations, comfort, or risk control with a clear owner",
            [
                "Is installed with no integration or training",
                "Collects data that nobody can access lawfully",
                "Replaces fire-safety systems without certification",
            ],
        ),
        _mcq(
            "IoT sensors should be specified with:",
            "Purpose, accuracy, battery or power, and data path",
            [
                "As many devices as possible with no use case",
                "Open guest Wi-Fi as the only security control",
                "No plan for calibration or replacement",
            ],
        ),
        _mcq(
            "Building automation adds value when:",
            "Schedules and alarms match how the building is actually used",
            [
                "Every point is trended forever with no review",
                "Occupants cannot override comfort at all",
                "The vendor is the only party with login credentials",
            ],
        ),
        _mcq(
            "AI valuation tools should be treated as:",
            "Decision support that still needs human and market checks",
            [
                "A legal substitute for inspection in every case",
                "Always more accurate than local comparables",
                "Safe to use with biased or missing training data",
            ],
        ),
        _mcq(
            "Mobile property platforms help teams when they:",
            "Log work, photos, and communication in one auditable trail",
            [
                "Store passwords in a shared group chat",
                "Work only offline with no backup",
                "Bypass required notices because “the app sent it”",
            ],
        ),
        _mcq(
            "Blockchain land-registration ideas matter because:",
            "Trusted records of rights can reduce fraud and delay—if law recognizes them",
            [
                "A token always equals legal title everywhere today",
                "Paper registries can be discarded immediately worldwide",
                "Privacy and identity issues disappear on a public chain",
            ],
        ),
    ],
    "chapters": [
        {
            "title": "Smart buildings and IoT",
            "assignment_title": "Sensor use-case brief",
            "quiz_title": "Quiz: Smart buildings",
            "quiz_questions": [
                _mcq(
                    "Occupancy sensing is typically used to:",
                    "Control lighting, HVAC, or space analytics",
                    [
                        "Replace access control for high-security vaults",
                        "Publish named occupant locations publicly",
                        "Disable life-safety detection",
                    ],
                ),
                _mcq(
                    "Cybersecurity for building systems includes:",
                    "Network segmentation, patching, and least-privilege accounts",
                    [
                        "Default passwords left on controllers",
                        "Flat networks with every device exposed",
                        "No logs because storage is expensive",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Smart building systems",
                    "body": (
                        "<h2>From gizmos to outcomes</h2>"
                        "<p>Define the operational problem first—comfort, energy, security, or "
                        "maintenance—then choose devices and integrations that staff can run.</p>"
                        "<ul><li>Map existing BMS, access, and ticketing tools.</li>"
                        "<li>Avoid duplicate sensors that nobody maintains.</li>"
                        "<li>Agree who owns data quality and privacy.</li></ul>"
                    ),
                    "subtopic_title": "IoT in practice",
                    "subtopic_body": (
                        "<p>Battery life, connectivity, and a named owner for failed devices matter "
                        "more than the brochure’s dashboard screenshot.</p>"
                    ),
                    "nested_note": (
                        "<p>Treat plant-room networks as operational technology, not office Wi-Fi.</p>"
                    ),
                },
                {
                    "title": "IoT sensors",
                    "body": (
                        "<p>Temperature, leak, vibration, and air-quality sensors only help if "
                        "alarms reach a person who can act the same day.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Building automation",
            "assignment_title": "BMS alarm response playbook",
            "quiz_title": "Quiz: Automation",
            "quiz_questions": [
                _mcq(
                    "A healthy BMS alarm strategy:",
                    "Prioritizes life safety and plant protection, then comfort",
                    [
                        "Emails every analog change to the whole company",
                        "Silences critical alarms to reduce noise",
                        "Has no named on-call engineer",
                    ],
                ),
                _mcq(
                    "Sequences of operation should be:",
                    "Documented, commissioned, and updated after changes",
                    [
                        "Known only to the original programmer",
                        "Guessed from watching the plant",
                        "Optional if the graphics look modern",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Automation that operators trust",
                    "body": (
                        "<h2>Controls, graphics, and handover</h2>"
                        "<p>Graphics should match reality. Trends support diagnostics. Training "
                        "prevents “auto” being switched to permanent manual.</p>"
                    ),
                },
                {
                    "title": "Integrating systems",
                    "body": (
                        "<p>APIs and open protocols reduce lock-in. Still test fail-safes when "
                        "networks drop—doors and fire systems must fail safe.</p>"
                    ),
                },
            ],
        },
        {
            "title": "Digital property operations",
            "assignment_title": "Mobile PM workflow map",
            "quiz_title": "Quiz: Digital operations",
            "quiz_questions": [
                _mcq(
                    "A mobile work-order app should capture:",
                    "Location, photos, status, and who signed off",
                    [
                        "Only a thumbs-up emoji from the contractor",
                        "Personal tenant data in a public channel",
                        "Nothing if the job was “quick”",
                    ],
                ),
                _mcq(
                    "Data protection in PropTech means:",
                    "Collect only what you need and control who can see it",
                    [
                        "Export full occupant lists to personal email",
                        "Unlimited retention of CCTV “just in case” with no policy",
                        "Shared admin logins for convenience",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "Mobile property management platforms",
                    "body": (
                        "<h2>Field work with an audit trail</h2>"
                        "<p>Inspect, report defects, and close jobs on a phone. Integrate with "
                        "finance so invoices match completed work.</p>"
                    ),
                },
                {
                    "title": "Occupant and owner experience",
                    "body": (
                        "<p>Portals reduce email chaos when SLAs are real. Do not replace human "
                        "escalation for emergencies.</p>"
                    ),
                },
            ],
        },
        {
            "title": "AI, blockchain, and responsible adoption",
            "assignment_title": "Tech ethics checklist",
            "quiz_title": "Quiz: Emerging tools",
            "quiz_questions": [
                _mcq(
                    "AI-powered valuation is weakest when:",
                    "Local sales evidence is thin or the model is a black box",
                    [
                        "A valuer inspects and challenges the output",
                        "Training data is documented and bias-tested",
                        "The user understands the model’s limits",
                    ],
                ),
                _mcq(
                    "Land-registry innovation should be judged by:",
                    "Legal recognition, identity, and dispute processes—not hype",
                    [
                        "Token price on a given afternoon",
                        "Whether a pilot used the word blockchain",
                        "Ignoring fraud and key-loss scenarios",
                    ],
                ),
            ],
            "topics": [
                {
                    "title": "AI-powered valuation tools",
                    "body": (
                        "<h2>Models as assistants</h2>"
                        "<p>Automated estimates can screen a portfolio. They do not replace "
                        "professional judgment where lending, litigation, or unique assets are involved.</p>"
                    ),
                },
                {
                    "title": "Blockchain and land records",
                    "body": (
                        "<p>Immutable ledgers can support transparency if identity, law, and "
                        "governance are solved. Pilot with the registry—not around it.</p>"
                    ),
                },
            ],
        },
    ],
}

SPECS = [FMC_SPEC, PMC_SPEC, CHMC_SPEC, HSC_SPEC, CEEBM_SPEC, RIPVC_SPEC, SRET_SPEC]


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
            print("Landing-page certificate courses already exist.")
            return
        print(f"Created courses: {', '.join(created)}")
    finally:
        db.close()


if __name__ == "__main__":
    run()
