"""Student assignment answers awaiting review.

Revision ID: 011_assignment_submissions
Revises: 010_block_completions
Create Date: 2026-09-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_assignment_submissions"
down_revision: Union[str, None] = "010_block_completions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "assignment_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "content_block_id",
            sa.Integer(),
            sa.ForeignKey("content_blocks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(length=1024), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="under_review"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "content_block_id", name="uq_user_assignment_submission"),
    )
    op.create_index("ix_assignment_submissions_user_id", "assignment_submissions", ["user_id"])
    op.create_index(
        "ix_assignment_submissions_content_block_id",
        "assignment_submissions",
        ["content_block_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_assignment_submissions_content_block_id", table_name="assignment_submissions")
    op.drop_index("ix_assignment_submissions_user_id", table_name="assignment_submissions")
    op.drop_table("assignment_submissions")
