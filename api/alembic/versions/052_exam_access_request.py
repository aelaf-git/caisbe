"""Exam access request stamp; new enrollments default exam_access restricted.

Revision ID: 052_exam_access_request
Revises: 051_seminar_cover
Create Date: 2026-10-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "052_exam_access_request"
down_revision: Union[str, None] = "051_seminar_cover"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "enrollments",
        sa.Column("exam_access_requested_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column(
        "enrollments",
        "exam_access",
        existing_type=sa.String(length=16),
        server_default="restricted",
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "enrollments",
        "exam_access",
        existing_type=sa.String(length=16),
        server_default="allowed",
        existing_nullable=False,
    )
    op.drop_column("enrollments", "exam_access_requested_at")
