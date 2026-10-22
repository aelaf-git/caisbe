"""Direct assignments assigned to selected students.

Revision ID: 056_direct_assignments
Revises: 055_exam_identity_review
Create Date: 2026-10-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "056_direct_assignments"
down_revision: Union[str, None] = "055_exam_identity_review"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "direct_assignments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(length=1024), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("points_possible", sa.Integer(), nullable=True),
        sa.Column("due_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_direct_assignments_course_id", "direct_assignments", ["course_id"])

    op.create_table(
        "direct_assignment_recipients",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "direct_assignment_id",
            sa.Integer(),
            sa.ForeignKey("direct_assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.UniqueConstraint("direct_assignment_id", "user_id", name="uq_direct_assignment_recipient"),
    )
    op.create_index(
        "ix_direct_assignment_recipients_assignment_id",
        "direct_assignment_recipients",
        ["direct_assignment_id"],
    )
    op.create_index("ix_direct_assignment_recipients_user_id", "direct_assignment_recipients", ["user_id"])

    op.create_table(
        "direct_assignment_submissions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "direct_assignment_id",
            sa.Integer(),
            sa.ForeignKey("direct_assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(length=1024), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="under_review"),
        sa.Column("score", sa.Integer(), nullable=True),
        sa.Column("feedback", sa.Text(), nullable=True),
        sa.Column("graded_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("graded_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "direct_assignment_id", name="uq_user_direct_assignment_submission"),
    )
    op.create_index("ix_direct_assignment_submissions_user_id", "direct_assignment_submissions", ["user_id"])
    op.create_index(
        "ix_direct_assignment_submissions_assignment_id",
        "direct_assignment_submissions",
        ["direct_assignment_id"],
    )

    op.create_table(
        "direct_assignment_attempts",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "submission_id",
            sa.Integer(),
            sa.ForeignKey("direct_assignment_submissions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(length=1024), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("submitted_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index(
        "ix_direct_assignment_attempts_submission_id",
        "direct_assignment_attempts",
        ["submission_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_direct_assignment_attempts_submission_id", table_name="direct_assignment_attempts")
    op.drop_table("direct_assignment_attempts")
    op.drop_index("ix_direct_assignment_submissions_assignment_id", table_name="direct_assignment_submissions")
    op.drop_index("ix_direct_assignment_submissions_user_id", table_name="direct_assignment_submissions")
    op.drop_table("direct_assignment_submissions")
    op.drop_index("ix_direct_assignment_recipients_user_id", table_name="direct_assignment_recipients")
    op.drop_index("ix_direct_assignment_recipients_assignment_id", table_name="direct_assignment_recipients")
    op.drop_table("direct_assignment_recipients")
    op.drop_index("ix_direct_assignments_course_id", table_name="direct_assignments")
    op.drop_table("direct_assignments")
