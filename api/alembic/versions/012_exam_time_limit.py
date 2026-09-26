"""Optional final-exam time limit and an in-progress session per student.

Revision ID: 012_exam_time_limit
Revises: 011_assignment_submissions
Create Date: 2026-09-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "012_exam_time_limit"
down_revision: Union[str, None] = "011_assignment_submissions"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("final_exams", sa.Column("time_limit_minutes", sa.Integer(), nullable=True))
    op.create_table(
        "exam_sessions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "final_exam_id",
            sa.Integer(),
            sa.ForeignKey("final_exams.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "final_exam_id", name="uq_user_exam_session"),
    )
    op.create_index("ix_exam_sessions_user_id", "exam_sessions", ["user_id"])
    op.create_index("ix_exam_sessions_final_exam_id", "exam_sessions", ["final_exam_id"])


def downgrade() -> None:
    op.drop_index("ix_exam_sessions_final_exam_id", table_name="exam_sessions")
    op.drop_index("ix_exam_sessions_user_id", table_name="exam_sessions")
    op.drop_table("exam_sessions")
    op.drop_column("final_exams", "time_limit_minutes")
