from sqlalchemy import inspect, text
from sqlalchemy.engine import Engine


def ensure_sqlite_columns(engine: Engine) -> None:
    """Add columns introduced after the initial portal schema (SQLite has no ALTER evolve)."""
    if engine.dialect.name != "sqlite":
        return

    inspector = inspect(engine)
    tables = set(inspector.get_table_names())

    with engine.begin() as conn:
        if "users" in tables:
            user_cols = {c["name"] for c in inspector.get_columns("users")}
            if "role" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN role VARCHAR(32) DEFAULT 'student'"))
            if "phone" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN phone VARCHAR(40)"))
            if "country" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN country VARCHAR(100)"))
            if "city" not in user_cols:
                conn.execute(text("ALTER TABLE users ADD COLUMN city VARCHAR(100)"))

        if "courses" in tables:
            course_cols = {c["name"] for c in inspector.get_columns("courses")}
            if "status" not in course_cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN status VARCHAR(32) DEFAULT 'draft'"))
            if "cover_url" not in course_cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN cover_url VARCHAR(512)"))
            if "pass_percent" not in course_cols:
                conn.execute(text("ALTER TABLE courses ADD COLUMN pass_percent INTEGER DEFAULT 70"))
            # Retire legacy seed catalog from student portal until explicitly published.
            conn.execute(text("UPDATE courses SET status = 'draft' WHERE status IS NULL OR status = ''"))

        if "lessons" in tables:
            lesson_cols = {c["name"] for c in inspector.get_columns("lessons")}
            if "body" not in lesson_cols:
                conn.execute(text("ALTER TABLE lessons ADD COLUMN body TEXT"))

        if "content_blocks" in tables:
            block_cols = {c["name"] for c in inspector.get_columns("content_blocks")}
            if "parent_id" not in block_cols:
                conn.execute(text("ALTER TABLE content_blocks ADD COLUMN parent_id INTEGER"))
                conn.execute(
                    text(
                        "CREATE INDEX IF NOT EXISTS ix_content_blocks_parent_id ON content_blocks (parent_id)"
                    )
                )
                # Promote legacy lesson.body into a top-level text block.
                lessons_with_body = conn.execute(
                    text(
                        """
                        SELECT id, body FROM lessons
                        WHERE body IS NOT NULL AND TRIM(body) != ''
                        """
                    )
                ).fetchall()
                for lesson_id, body in lessons_with_body:
                    conn.execute(
                        text(
                            """
                            INSERT INTO content_blocks (
                                lesson_id, chapter_id, parent_id, block_type, title, body, url, label, quiz_id, sort_order
                            ) VALUES (
                                :lesson_id, NULL, NULL, 'text', NULL, :body, NULL, NULL, NULL, -1
                            )
                            """
                        ),
                        {"lesson_id": lesson_id, "body": body},
                    )
                    conn.execute(
                        text("UPDATE lessons SET body = NULL WHERE id = :lesson_id"),
                        {"lesson_id": lesson_id},
                    )
                # Attach orphan media to the nearest prior text/subtopic in the same lesson.
                orphans = conn.execute(
                    text(
                        """
                        SELECT id, lesson_id, sort_order FROM content_blocks
                        WHERE lesson_id IS NOT NULL
                          AND parent_id IS NULL
                          AND block_type IN ('video', 'pdf', 'document', 'link')
                        ORDER BY lesson_id, sort_order, id
                        """
                    )
                ).fetchall()
                for orphan_id, lesson_id, sort_order in orphans:
                    parent = conn.execute(
                        text(
                            """
                            SELECT id FROM content_blocks
                            WHERE lesson_id = :lesson_id
                              AND parent_id IS NULL
                              AND block_type IN ('text', 'subtopic')
                              AND (sort_order < :sort_order OR (sort_order = :sort_order AND id < :orphan_id))
                            ORDER BY sort_order DESC, id DESC
                            LIMIT 1
                            """
                        ),
                        {
                            "lesson_id": lesson_id,
                            "sort_order": sort_order,
                            "orphan_id": orphan_id,
                        },
                    ).fetchone()
                    if parent is None:
                        conn.execute(
                            text(
                                """
                                INSERT INTO content_blocks (
                                    lesson_id, chapter_id, parent_id, block_type, title, body, url, label, quiz_id, sort_order
                                ) VALUES (
                                    :lesson_id, NULL, NULL, 'text', 'Content', '', NULL, NULL, NULL, :sort_order
                                )
                                """
                            ),
                            {"lesson_id": lesson_id, "sort_order": sort_order},
                        )
                        parent = conn.execute(text("SELECT last_insert_rowid()")).fetchone()
                    conn.execute(
                        text("UPDATE content_blocks SET parent_id = :parent_id WHERE id = :id"),
                        {"parent_id": parent[0], "id": orphan_id},
                    )

            block_cols = {c["name"] for c in inspector.get_columns("content_blocks")}
            needs_rebuild = "chapter_id" not in block_cols
            if needs_rebuild:
                conn.execute(
                    text(
                        """
                        CREATE TABLE content_blocks_new (
                            id INTEGER NOT NULL PRIMARY KEY,
                            lesson_id INTEGER,
                            chapter_id INTEGER,
                            block_type VARCHAR(32) NOT NULL,
                            title VARCHAR(255),
                            body TEXT,
                            url VARCHAR(1024),
                            label VARCHAR(255),
                            quiz_id INTEGER,
                            sort_order INTEGER NOT NULL DEFAULT 0,
                            FOREIGN KEY(lesson_id) REFERENCES lessons (id) ON DELETE CASCADE,
                            FOREIGN KEY(chapter_id) REFERENCES chapters (id) ON DELETE CASCADE,
                            FOREIGN KEY(quiz_id) REFERENCES quizzes (id)
                        )
                        """
                    )
                )
                conn.execute(
                    text(
                        """
                        INSERT INTO content_blocks_new (
                            id, lesson_id, chapter_id, block_type, title, body, url, label, quiz_id, sort_order
                        )
                        SELECT
                            id, lesson_id, NULL, block_type, title, body, url, label, quiz_id, sort_order
                        FROM content_blocks
                        """
                    )
                )
                conn.execute(text("DROP TABLE content_blocks"))
                conn.execute(text("ALTER TABLE content_blocks_new RENAME TO content_blocks"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_content_blocks_lesson_id ON content_blocks (lesson_id)"))
                conn.execute(text("CREATE INDEX IF NOT EXISTS ix_content_blocks_chapter_id ON content_blocks (chapter_id)"))
