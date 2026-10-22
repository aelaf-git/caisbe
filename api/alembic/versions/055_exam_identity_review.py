"""Exam session identity review status for admin approval.

Revision ID: 055_exam_identity_review
Revises: 054_exam_identity_photos
Create Date: 2026-10-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "055_exam_identity_review"
down_revision: Union[str, None] = "054_exam_identity_photos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exam_sessions", sa.Column("identity_status", sa.String(length=16), nullable=True))
    op.add_column("exam_sessions", sa.Column("identity_reviewed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "exam_sessions",
        sa.Column("identity_reviewed_by_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=True),
    )
    op.add_column("exam_sessions", sa.Column("identity_review_note", sa.Text(), nullable=True))
    op.create_index("ix_exam_sessions_identity_status", "exam_sessions", ["identity_status"])


def downgrade() -> None:
    op.drop_index("ix_exam_sessions_identity_status", table_name="exam_sessions")
    op.drop_column("exam_sessions", "identity_review_note")
    op.drop_column("exam_sessions", "identity_reviewed_by_id")
    op.drop_column("exam_sessions", "identity_reviewed_at")
    op.drop_column("exam_sessions", "identity_status")
