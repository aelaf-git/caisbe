"""Published content snapshot and soft-deleted curriculum rows.

Revision ID: 062_course_content_snapshot
Revises: 061_course_content_published
Create Date: 2026-11-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "062_course_content_snapshot"
down_revision: Union[str, None] = "061_course_content_published"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("published_content", sa.JSON(), nullable=True))
    op.add_column(
        "courses",
        sa.Column("content_published_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column("chapters", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("lessons", sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "content_blocks",
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("content_blocks", "deleted_at")
    op.drop_column("lessons", "deleted_at")
    op.drop_column("chapters", "deleted_at")
    op.drop_column("courses", "content_published_at")
    op.drop_column("courses", "published_content")
