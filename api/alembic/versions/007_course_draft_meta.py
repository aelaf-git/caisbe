"""Add course draft_meta for unpublished published-course edits.

Revision ID: 007_course_draft_meta
Revises: 006_ensure_media_tables
Create Date: 2026-09-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "007_course_draft_meta"
down_revision: Union[str, None] = "006_ensure_media_tables"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("draft_meta", sa.JSON(), nullable=True))
    op.add_column(
        "courses",
        sa.Column(
            "has_unpublished_changes",
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    op.drop_column("courses", "has_unpublished_changes")
    op.drop_column("courses", "draft_meta")
