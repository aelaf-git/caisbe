"""Industry events and CPD activities tables.

Revision ID: 014_industry_events_cpd
Revises: 013_exam_shuffle
Create Date: 2026-09-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "014_industry_events_cpd"
down_revision: Union[str, None] = "013_exam_shuffle"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "industry_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("region", sa.String(length=120), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("starts_on", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ends_on", sa.DateTime(timezone=True), nullable=True),
        sa.Column("source_name", sa.String(length=160), nullable=True),
        sa.Column("source_url", sa.String(length=1024), nullable=True),
        sa.Column("report_file_url", sa.String(length=1024), nullable=True),
        sa.Column("cpd_hours", sa.Float(), nullable=True),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_industry_events_id", "industry_events", ["id"])
    op.create_index("ix_industry_events_published", "industry_events", ["published"])
    op.create_index("ix_industry_events_starts_on", "industry_events", ["starts_on"])
    op.create_index("ix_industry_events_event_type", "industry_events", ["event_type"])

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


def downgrade() -> None:
    op.drop_index("ix_cpd_activities_category", table_name="cpd_activities")
    op.drop_index("ix_cpd_activities_published", table_name="cpd_activities")
    op.drop_index("ix_cpd_activities_id", table_name="cpd_activities")
    op.drop_table("cpd_activities")
    op.drop_index("ix_industry_events_event_type", table_name="industry_events")
    op.drop_index("ix_industry_events_starts_on", table_name="industry_events")
    op.drop_index("ix_industry_events_published", table_name="industry_events")
    op.drop_index("ix_industry_events_id", table_name="industry_events")
    op.drop_table("industry_events")
