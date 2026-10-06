"""Per-course content protection flag.

Revision ID: 034_course_content_protection
Revises: 033_exam_secure_mode
Create Date: 2026-10-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "034_course_content_protection"
down_revision: Union[str, None] = "033_exam_secure_mode"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("content_protection", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("courses", "content_protection")
