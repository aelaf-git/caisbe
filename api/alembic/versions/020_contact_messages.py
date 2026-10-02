"""Contact Us form submissions.

Revision ID: 020_contact_messages
Revises: 019_testimonials
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "020_contact_messages"
down_revision: Union[str, None] = "019_testimonials"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "contact_messages",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=False),
        sa.Column("last_name", sa.String(length=80), nullable=False),
        sa.Column("company", sa.String(length=160), nullable=True),
        sa.Column("job_title", sa.String(length=120), nullable=True),
        sa.Column("phone", sa.String(length=40), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("help_topic", sa.String(length=255), nullable=True),
        sa.Column("comments", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="new"),
        sa.Column("admin_reply", sa.Text(), nullable=True),
        sa.Column("replied_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("replied_by_admin_id", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["replied_by_admin_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_contact_messages_id", "contact_messages", ["id"])
    op.create_index("ix_contact_messages_email", "contact_messages", ["email"])
    op.create_index("ix_contact_messages_status", "contact_messages", ["status"])
    op.create_index("ix_contact_messages_created_at", "contact_messages", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_contact_messages_created_at", table_name="contact_messages")
    op.drop_index("ix_contact_messages_status", table_name="contact_messages")
    op.drop_index("ix_contact_messages_email", table_name="contact_messages")
    op.drop_index("ix_contact_messages_id", table_name="contact_messages")
    op.drop_table("contact_messages")
