"""Student access restrictions and login activity.

Revision ID: 041_access_control
Revises: 040_site_pages
Create Date: 2026-10-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "041_access_control"
down_revision: Union[str, None] = "040_site_pages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("suspended_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "enrollments",
        sa.Column("course_access", sa.String(length=16), nullable=False, server_default="allowed"),
    )
    op.add_column(
        "enrollments",
        sa.Column("exam_access", sa.String(length=16), nullable=False, server_default="allowed"),
    )
    op.create_table(
        "login_events",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("success", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("reason", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("ip_address", sa.String(length=64), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_login_events_id", "login_events", ["id"])
    op.create_index("ix_login_events_user_id", "login_events", ["user_id"])
    op.create_index("ix_login_events_email", "login_events", ["email"])
    op.create_index("ix_login_events_created_at", "login_events", ["created_at"])


def downgrade() -> None:
    op.drop_index("ix_login_events_created_at", table_name="login_events")
    op.drop_index("ix_login_events_email", table_name="login_events")
    op.drop_index("ix_login_events_user_id", table_name="login_events")
    op.drop_index("ix_login_events_id", table_name="login_events")
    op.drop_table("login_events")
    op.drop_column("enrollments", "exam_access")
    op.drop_column("enrollments", "course_access")
    op.drop_column("users", "suspended_at")
