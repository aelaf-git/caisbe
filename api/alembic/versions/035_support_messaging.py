"""Student–admin support threads and messages.

Revision ID: 035_support_messaging
Revises: 034_course_content_protection
Create Date: 2026-10-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "035_support_messaging"
down_revision: Union[str, None] = "034_course_content_protection"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "support_threads",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False, server_default="question"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("last_message_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_support_threads_user_id", "support_threads", ["user_id"])
    op.create_index("ix_support_threads_kind", "support_threads", ["kind"])
    op.create_index("ix_support_threads_status", "support_threads", ["status"])
    op.create_index("ix_support_threads_last_message_at", "support_threads", ["last_message_at"])

    op.create_table(
        "support_messages",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "thread_id",
            sa.Integer(),
            sa.ForeignKey("support_threads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "sender_user_id",
            sa.Integer(),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_from_admin", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_support_messages_thread_id", "support_messages", ["thread_id"])
    op.create_index("ix_support_messages_sender_user_id", "support_messages", ["sender_user_id"])
    op.create_index("ix_support_messages_created_at", "support_messages", ["created_at"])


def downgrade() -> None:
    op.drop_table("support_messages")
    op.drop_table("support_threads")
