"""Admin notification broadcasts log.

Revision ID: 030_notif_broadcasts
Revises: 029_user_documents
Create Date: 2026-10-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "030_notif_broadcasts"
down_revision: Union[str, None] = "029_user_documents"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "notification_broadcasts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False, server_default="announcement"),
        sa.Column("link", sa.String(length=255), nullable=True),
        sa.Column("audience", sa.String(length=40), nullable=False, server_default="all_students"),
        sa.Column("recipient_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sent_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_notification_broadcasts_id", "notification_broadcasts", ["id"])


def downgrade() -> None:
    op.drop_index("ix_notification_broadcasts_id", table_name="notification_broadcasts")
    op.drop_table("notification_broadcasts")
