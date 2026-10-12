"""Pending registrations awaiting email verification.

Revision ID: 026_pending_registrations
Revises: 025_exam_questions_to_appear
Create Date: 2026-10-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "026_pending_registrations"
down_revision: Union[str, None] = "025_exam_questions_to_appear"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "pending_registrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column("given_name", sa.String(length=80), nullable=True),
        sa.Column("family_name", sa.String(length=80), nullable=True),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("organization", sa.String(length=160), nullable=True),
        sa.Column("job_title", sa.String(length=120), nullable=True),
        sa.Column("membership_type", sa.String(length=40), nullable=True),
        sa.Column("details", sa.Text(), nullable=True),
        sa.Column("supporting_document_url", sa.String(length=1024), nullable=True),
        sa.Column("supporting_document_label", sa.String(length=160), nullable=True),
        sa.Column("supporting_document_name", sa.String(length=255), nullable=True),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_pending_registrations_id"), "pending_registrations", ["id"], unique=False)
    op.create_index(op.f("ix_pending_registrations_email"), "pending_registrations", ["email"], unique=True)
    op.create_index(
        op.f("ix_pending_registrations_token_hash"),
        "pending_registrations",
        ["token_hash"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_pending_registrations_token_hash"), table_name="pending_registrations")
    op.drop_index(op.f("ix_pending_registrations_email"), table_name="pending_registrations")
    op.drop_index(op.f("ix_pending_registrations_id"), table_name="pending_registrations")
    op.drop_table("pending_registrations")
