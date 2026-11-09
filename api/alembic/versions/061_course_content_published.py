"""Separate course listing from lesson access.

Revision ID: 061_course_content_published
Revises: 060_exam_wait_days
Create Date: 2026-11-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "061_course_content_published"
down_revision: Union[str, None] = "060_exam_wait_days"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("content_published", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.execute("UPDATE courses SET content_published = true WHERE status = 'published'")


def downgrade() -> None:
    op.drop_column("courses", "content_published")
