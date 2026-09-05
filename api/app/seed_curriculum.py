"""Replace the MEL draft course outline with the Master Executive Leadership curriculum."""

from __future__ import annotations

import html
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.html_sanitize import sanitize_html
from app.models import Chapter, ContentBlock, Course, Lesson

CURRICULUM_PATH = Path(__file__).with_name("mel_curriculum.md")

HEADING_CHAPTER = re.compile(r"^##\s+Chapter\s+\d+:\s+(.+)$")
HEADING_TOPIC = re.compile(r"^###\s+Topic\s+[\d.]+:\s+(.+)$")
HEADING_SUBTOPIC = re.compile(r"^####\s+Subtopic\s+[\d.]+:\s+(.+)$")


def inline_md(text: str) -> str:
    escaped = html.escape(text)
    escaped = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)", r"<em>\1</em>", escaped)
    escaped = re.sub(r"`([^`]+)`", r"<code>\1</code>", escaped)
    return escaped


def _is_table_line(line: str) -> bool:
    return line.strip().startswith("|") and "|" in line.strip()[1:]


def _is_table_divider(line: str) -> bool:
    stripped = line.strip().strip("|").replace(":", "").replace("-", "").replace("|", "").replace(" ", "")
    return _is_table_line(line) and stripped == ""


def table_to_html(lines: list[str]) -> str:
    rows: list[list[str]] = []
    for line in lines:
        if _is_table_divider(line):
            continue
        cells = [cell.strip() for cell in line.strip().strip("|").split("|")]
        rows.append(cells)
    if not rows:
        return ""
    header, body = rows[0], rows[1:]
    if not body:
        return "<p>" + " · ".join(inline_md(cell) for cell in header) + "</p>"
    items: list[str] = []
    for row in body:
        parts: list[str] = []
        for index, cell in enumerate(row):
            label = header[index] if index < len(header) else f"Column {index + 1}"
            parts.append(f"<strong>{inline_md(label)}:</strong> {inline_md(cell)}")
        items.append("<li>" + " — ".join(parts) + "</li>")
    return "<ul>" + "".join(items) + "</ul>"


def markdown_to_html(source: str) -> str:
    source = source.strip()
    if not source:
        return ""

    chunks: list[str] = []
    fence_parts = re.split(r"```[^\n]*\n", source)
    for index, part in enumerate(fence_parts):
        if index % 2 == 1:
            code = html.escape(part.rstrip("`").rstrip())
            chunks.append(f"<pre><code>{code}</code></pre>")
            continue

        lines = part.replace("\r\n", "\n").split("\n")
        i = 0
        while i < len(lines):
            line = lines[i]
            stripped = line.strip()
            if not stripped or stripped == "---":
                i += 1
                continue
            if _is_table_line(stripped):
                table_lines = []
                while i < len(lines) and _is_table_line(lines[i].strip()):
                    table_lines.append(lines[i])
                    i += 1
                chunks.append(table_to_html(table_lines))
                continue
            if stripped.startswith(("- ", "* ")):
                items: list[str] = []
                while i < len(lines) and lines[i].strip().startswith(("- ", "* ")):
                    items.append("<li>" + inline_md(lines[i].strip()[2:]) + "</li>")
                    i += 1
                chunks.append("<ul>" + "".join(items) + "</ul>")
                continue
            numbered = re.match(r"^(\d+)\.\s+(.*)$", stripped)
            if numbered:
                items = []
                while i < len(lines):
                    match = re.match(r"^(\d+)\.\s+(.*)$", lines[i].strip())
                    if not match:
                        break
                    items.append("<li>" + inline_md(match.group(2)) + "</li>")
                    i += 1
                chunks.append("<ol>" + "".join(items) + "</ol>")
                continue
            para = [stripped]
            i += 1
            while i < len(lines):
                nxt = lines[i].strip()
                if (
                    not nxt
                    or nxt == "---"
                    or nxt.startswith(("- ", "* "))
                    or _is_table_line(nxt)
                    or re.match(r"^\d+\.\s+", nxt)
                ):
                    break
                para.append(nxt)
                i += 1
            chunks.append("<p>" + inline_md(" ".join(para)) + "</p>")
    return "".join(chunks)


def parse_curriculum(markdown: str) -> list[dict]:
    chapters: list[dict] = []
    current_chapter: dict | None = None
    current_topic: dict | None = None
    current_subtopic: dict | None = None
    buffer: list[str] = []

    def flush_buffer() -> str:
        text = "\n".join(buffer).strip()
        buffer.clear()
        return text

    def attach_buffer() -> None:
        text = flush_buffer()
        if not text:
            return
        if current_subtopic is not None:
            current_subtopic["body"] = text
        elif current_topic is not None:
            current_topic["intro"] = text

    for raw in markdown.replace("\r\n", "\n").split("\n"):
        chapter_match = HEADING_CHAPTER.match(raw.strip())
        topic_match = HEADING_TOPIC.match(raw.strip())
        subtopic_match = HEADING_SUBTOPIC.match(raw.strip())
        if chapter_match:
            attach_buffer()
            current_subtopic = None
            current_topic = None
            current_chapter = {"title": chapter_match.group(1).strip(), "topics": []}
            chapters.append(current_chapter)
            continue
        if topic_match:
            attach_buffer()
            current_subtopic = None
            if current_chapter is None:
                continue
            current_topic = {
                "title": topic_match.group(1).strip(),
                "intro": "",
                "subtopics": [],
            }
            current_chapter["topics"].append(current_topic)
            continue
        if subtopic_match:
            attach_buffer()
            if current_topic is None:
                continue
            current_subtopic = {"title": subtopic_match.group(1).strip(), "body": ""}
            current_topic["subtopics"].append(current_subtopic)
            continue
        if raw.startswith("# "):
            continue
        buffer.append(raw)
    attach_buffer()
    return chapters


def seed_course(db: Session, course: Course, chapters_data: list[dict]) -> None:
    for chapter in list(course.chapters):
        db.delete(chapter)
    db.flush()

    course.title = "Master Executive Leadership: Strategy, Culture & Execution"
    course.description = (
        "A comprehensive curriculum on strategy, culture, and execution: foundational "
        "leadership, high-impact communication, strategic decisions, and leading change at scale."
    )

    for chapter_index, chapter_data in enumerate(chapters_data):
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
                body=None,
                sort_order=topic_index,
            )
            db.add(lesson)
            db.flush()
            order = 0
            intro_html = sanitize_html(markdown_to_html(topic_data.get("intro") or ""))
            if intro_html:
                db.add(
                    ContentBlock(
                        lesson_id=lesson.id,
                        block_type="text",
                        title=None,
                        body=intro_html,
                        sort_order=order,
                    )
                )
                order += 1
            for subtopic in topic_data["subtopics"]:
                db.add(
                    ContentBlock(
                        lesson_id=lesson.id,
                        block_type="subtopic",
                        title=subtopic["title"],
                        body=sanitize_html(markdown_to_html(subtopic.get("body") or "")),
                        sort_order=order,
                    )
                )
                order += 1
    db.commit()


def run() -> None:
    markdown = CURRICULUM_PATH.read_text(encoding="utf-8")
    chapters = parse_curriculum(markdown)
    if len(chapters) != 4:
        raise SystemExit(f"Expected 4 chapters, parsed {len(chapters)}")
    topic_count = sum(len(chapter["topics"]) for chapter in chapters)
    subtopic_count = sum(
        len(topic["subtopics"]) for chapter in chapters for topic in chapter["topics"]
    )
    if topic_count != 12 or subtopic_count != 36:
        raise SystemExit(f"Expected 12 topics / 36 subtopics, parsed {topic_count} / {subtopic_count}")

    db = SessionLocal()
    try:
        course = (
            db.query(Course)
            .filter((Course.code == "MEL") | (Course.slug == "mel"))
            .first()
        )
        if course is None:
            raise SystemExit("Draft course MEL was not found.")
        seed_course(db, course, chapters)
        print(f"Seeded course {course.id} ({course.code}) with {len(chapters)} chapters.")
    finally:
        db.close()


if __name__ == "__main__":
    run()
