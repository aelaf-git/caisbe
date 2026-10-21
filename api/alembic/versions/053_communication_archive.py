"""Outbound email archive and contact reply history.

Revision ID: 053_communication_archive
Revises: 052_exam_access_request
Create Date: 2026-10-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "053_communication_archive"
down_revision: Union[str, None] = "052_exam_access_request"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "outbound_emails",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="sent"),
        sa.Column("purpose", sa.String(length=32), nullable=False, server_default="system"),
        sa.Column("template_key", sa.String(length=64), nullable=True),
        sa.Column("from_address", sa.String(length=255), nullable=False),
        sa.Column("to_address", sa.String(length=255), nullable=False),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("html_body", sa.Text(), nullable=False),
        sa.Column("reply_to", sa.String(length=255), nullable=True),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="resend"),
        sa.Column("provider_message_id", sa.String(length=255), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("related_type", sa.String(length=64), nullable=True),
        sa.Column("related_id", sa.Integer(), nullable=True),
        sa.Column("triggered_by_user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.create_index("ix_outbound_emails_created_at", "outbound_emails", ["created_at"])
    op.create_index("ix_outbound_emails_to_address", "outbound_emails", ["to_address"])
    op.create_index("ix_outbound_emails_template_key", "outbound_emails", ["template_key"])
    op.create_index("ix_outbound_emails_related", "outbound_emails", ["related_type", "related_id"])

    op.create_table(
        "contact_message_replies",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("contact_message_id", sa.Integer(), sa.ForeignKey("contact_messages.id", ondelete="CASCADE"), nullable=False),
        sa.Column("direction", sa.String(length=16), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("sent_by_admin_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
        sa.Column("outbound_email_id", sa.Integer(), sa.ForeignKey("outbound_emails.id"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_contact_message_replies_message_id", "contact_message_replies", ["contact_message_id"])


def downgrade() -> None:
    op.drop_index("ix_contact_message_replies_message_id", table_name="contact_message_replies")
    op.drop_table("contact_message_replies")
    op.drop_index("ix_outbound_emails_related", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_template_key", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_to_address", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_created_at", table_name="outbound_emails")
    op.drop_table("outbound_emails")
