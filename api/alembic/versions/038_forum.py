"""Discussion forum categories, boards, threads, and replies.

Revision ID: 038_forum
Revises: 037_assignment_grading
Create Date: 2026-10-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "038_forum"
down_revision: Union[str, None] = "037_assignment_grading"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "forum_categories",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_forum_categories_slug", "forum_categories", ["slug"], unique=True)

    op.create_table(
        "forum_boards",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "category_id",
            sa.Integer(),
            sa.ForeignKey("forum_categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("title", sa.String(length=160), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("member_can_start", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_forum_boards_category_id", "forum_boards", ["category_id"])
    op.create_index("ix_forum_boards_slug", "forum_boards", ["slug"], unique=True)

    op.create_table(
        "forum_threads",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "board_id",
            sa.Integer(),
            sa.ForeignKey("forum_boards.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("pinned", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("locked", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_activity_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_forum_threads_board_id", "forum_threads", ["board_id"])
    op.create_index("ix_forum_threads_author_id", "forum_threads", ["author_id"])
    op.create_index("ix_forum_threads_pinned", "forum_threads", ["pinned"])
    op.create_index("ix_forum_threads_hidden", "forum_threads", ["hidden"])
    op.create_index("ix_forum_threads_last_activity_at", "forum_threads", ["last_activity_at"])

    op.create_table(
        "forum_replies",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "thread_id",
            sa.Integer(),
            sa.ForeignKey("forum_threads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="SET NULL"),
            nullable=True,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("hidden", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_forum_replies_thread_id", "forum_replies", ["thread_id"])
    op.create_index("ix_forum_replies_author_id", "forum_replies", ["author_id"])
    op.create_index("ix_forum_replies_hidden", "forum_replies", ["hidden"])
    op.create_index("ix_forum_replies_created_at", "forum_replies", ["created_at"])


def downgrade() -> None:
    op.drop_table("forum_replies")
    op.drop_table("forum_threads")
    op.drop_table("forum_boards")
    op.drop_table("forum_categories")
