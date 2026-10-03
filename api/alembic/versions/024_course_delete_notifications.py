"""Cascade course delete cleanup and student notifications.

Revision ID: 024_course_delete_notifications
Revises: 023_membership_order_items
Create Date: 2026-10-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "024_course_delete_notifications"
down_revision: Union[str, None] = "023_membership_order_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint("ck_order_items_course_or_membership", "order_items", type_="check")
    op.create_check_constraint(
        "ck_order_items_course_or_membership",
        "order_items",
        "(course_id IS NOT NULL AND membership_type IS NULL) OR "
        "(course_id IS NULL AND membership_type IS NOT NULL) OR "
        "(course_id IS NULL AND membership_type IS NULL)",
    )

    op.drop_constraint("enrollments_course_id_fkey", "enrollments", type_="foreignkey")
    op.create_foreign_key(
        "enrollments_course_id_fkey",
        "enrollments",
        "courses",
        ["course_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.drop_constraint("order_items_course_id_fkey", "order_items", type_="foreignkey")
    op.create_foreign_key(
        "order_items_course_id_fkey",
        "order_items",
        "courses",
        ["course_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("kind", sa.String(length=40), nullable=False, server_default="info"),
        sa.Column("link", sa.String(length=255), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )


def downgrade() -> None:
    op.drop_table("notifications")

    op.drop_constraint("order_items_course_id_fkey", "order_items", type_="foreignkey")
    op.create_foreign_key(
        "order_items_course_id_fkey",
        "order_items",
        "courses",
        ["course_id"],
        ["id"],
        ondelete="RESTRICT",
    )

    op.drop_constraint("enrollments_course_id_fkey", "enrollments", type_="foreignkey")
    op.create_foreign_key(
        "enrollments_course_id_fkey",
        "enrollments",
        "courses",
        ["course_id"],
        ["id"],
    )

    op.drop_constraint("ck_order_items_course_or_membership", "order_items", type_="check")
    op.create_check_constraint(
        "ck_order_items_course_or_membership",
        "order_items",
        "(course_id IS NOT NULL AND membership_type IS NULL) OR "
        "(course_id IS NULL AND membership_type IS NOT NULL)",
    )
