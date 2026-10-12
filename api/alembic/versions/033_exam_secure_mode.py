"""Secure exam mode + integrity events.

Revision ID: 033_exam_secure_mode
Revises: 032_user_appearance
Create Date: 2026-10-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "033_exam_secure_mode"
down_revision: Union[str, None] = "032_user_appearance"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "final_exams",
        sa.Column("secure_mode", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "final_exams",
        sa.Column(
            "max_integrity_violations",
            sa.Integer(),
            nullable=False,
            server_default="3",
        ),
    )

    op.alter_column("exam_sessions", "started_at", existing_type=sa.DateTime(timezone=True), nullable=True)
    op.add_column("exam_sessions", sa.Column("secure_ok_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "exam_sessions",
        sa.Column("violation_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column("exam_sessions", sa.Column("locked_out_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "exam_integrity_events",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column(
            "final_exam_id",
            sa.Integer(),
            sa.ForeignKey("final_exams.id", ondelete="CASCADE"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "exam_session_id",
            sa.Integer(),
            sa.ForeignKey("exam_sessions.id", ondelete="SET NULL"),
            nullable=True,
            index=True,
        ),
        sa.Column("phase", sa.String(length=16), nullable=False),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("detail_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("exam_integrity_events")
    op.drop_column("exam_sessions", "locked_out_at")
    op.drop_column("exam_sessions", "violation_count")
    op.drop_column("exam_sessions", "secure_ok_at")
    op.execute("UPDATE exam_sessions SET started_at = CURRENT_TIMESTAMP WHERE started_at IS NULL")
    op.alter_column("exam_sessions", "started_at", existing_type=sa.DateTime(timezone=True), nullable=False)
    op.drop_column("final_exams", "max_integrity_violations")
    op.drop_column("final_exams", "secure_mode")
