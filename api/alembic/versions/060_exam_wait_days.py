"""Minimum enrollment days before final exam.

Revision ID: 060_exam_wait_days
Revises: 059_seminar_access_name
Create Date: 2026-10-23

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "060_exam_wait_days"
down_revision: Union[str, None] = "059_seminar_access_name"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "final_exams",
        sa.Column("exam_wait_days", sa.Integer(), nullable=False, server_default="30"),
    )


def downgrade() -> None:
    op.drop_column("final_exams", "exam_wait_days")
