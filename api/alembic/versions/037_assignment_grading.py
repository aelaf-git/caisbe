"""Assignment points, due dates, scores, feedback, and attempt history.

Revision ID: 037_assignment_grading
Revises: 036_media_channels
Create Date: 2026-10-07

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "037_assignment_grading"
down_revision: Union[str, None] = "036_media_channels"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("content_blocks", sa.Column("points_possible", sa.Integer(), nullable=True))
    op.add_column("content_blocks", sa.Column("due_at", sa.DateTime(timezone=True), nullable=True))

    op.add_column("assignment_submissions", sa.Column("score", sa.Integer(), nullable=True))
    op.add_column("assignment_submissions", sa.Column("feedback", sa.Text(), nullable=True))
    op.add_column("assignment_submissions", sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("assignment_submissions", sa.Column("graded_by_id", sa.Integer(), nullable=True))
    op.add_column(
        "assignment_submissions",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_foreign_key(
        "fk_assignment_submissions_graded_by",
        "assignment_submissions",
        "users",
        ["graded_by_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_index(
        "ix_assignment_submissions_graded_by_id",
        "assignment_submissions",
        ["graded_by_id"],
    )

    op.create_table(
        "assignment_attempts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "submission_id",
            sa.Integer(),
            sa.ForeignKey("assignment_submissions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(length=1024), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_assignment_attempts_submission_id", "assignment_attempts", ["submission_id"])
    op.create_index("ix_assignment_attempts_submitted_at", "assignment_attempts", ["submitted_at"])


def downgrade() -> None:
    op.drop_index("ix_assignment_attempts_submitted_at", table_name="assignment_attempts")
    op.drop_index("ix_assignment_attempts_submission_id", table_name="assignment_attempts")
    op.drop_table("assignment_attempts")
    op.drop_index("ix_assignment_submissions_graded_by_id", table_name="assignment_submissions")
    op.drop_constraint("fk_assignment_submissions_graded_by", "assignment_submissions", type_="foreignkey")
    op.drop_column("assignment_submissions", "updated_at")
    op.drop_column("assignment_submissions", "graded_by_id")
    op.drop_column("assignment_submissions", "graded_at")
    op.drop_column("assignment_submissions", "feedback")
    op.drop_column("assignment_submissions", "score")
    op.drop_column("content_blocks", "due_at")
    op.drop_column("content_blocks", "points_possible")
