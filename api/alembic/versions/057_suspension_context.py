"""Store suspension reason and related course for emails.

Revision ID: 057_suspension_context
Revises: 056_direct_assignments
Create Date: 2026-10-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "057_suspension_context"
down_revision: Union[str, None] = "056_direct_assignments"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("suspension_reason", sa.Text(), nullable=True))
    op.add_column(
        "users",
        sa.Column(
            "suspension_course_id",
            sa.Integer(),
            sa.ForeignKey("courses.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    op.drop_column("users", "suspension_course_id")
    op.drop_column("users", "suspension_reason")
