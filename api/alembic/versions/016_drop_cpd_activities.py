"""Drop CPD activities table.

Revision ID: 016_drop_cpd_activities
Revises: 015_job_postings
Create Date: 2026-09-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_drop_cpd_activities"
down_revision: Union[str, None] = "015_job_postings"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_index("ix_cpd_activities_category", table_name="cpd_activities")
    op.drop_index("ix_cpd_activities_published", table_name="cpd_activities")
    op.drop_index("ix_cpd_activities_id", table_name="cpd_activities")
    op.drop_table("cpd_activities")


def downgrade() -> None:
    op.create_table(
        "cpd_activities",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("activity", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=64), nullable=False),
        sa.Column("hours_reported", sa.Float(), nullable=False, server_default="0"),
        sa.Column("hours_approved", sa.Float(), nullable=False, server_default="0"),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_cpd_activities_id", "cpd_activities", ["id"])
    op.create_index("ix_cpd_activities_published", "cpd_activities", ["published"])
    op.create_index("ix_cpd_activities_category", "cpd_activities", ["category"])
