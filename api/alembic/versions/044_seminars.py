"""Seminars listed on the certificate programs page.

Revision ID: 044_seminars
Revises: 043_news_external_url
Create Date: 2026-10-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "044_seminars"
down_revision: Union[str, None] = "043_news_external_url"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED = [
    {
        "title": "Sustainable Facility Operations Seminar",
        "description": (
            "A practice-focused seminar on energy, maintenance planning, and "
            "day-to-day sustainable operations for FM teams."
        ),
        "sort_order": 0,
    },
    {
        "title": "Workplace Experience & Soft Services Seminar",
        "description": (
            "Explore service quality, occupant experience, and soft-services coordination "
            "across commercial and institutional sites."
        ),
        "sort_order": 1,
    },
    {
        "title": "Africa–Canada Built Environment Leadership Seminar",
        "description": (
            "Cross-border dialogue on partnership models, capacity building, and "
            "professional standards in the built environment."
        ),
        "sort_order": 2,
    },
    {
        "title": "Health, Safety & Risk for Facility Leaders",
        "description": (
            "Seminar covering risk assessment, emergency readiness, and compliance essentials "
            "for facility and property managers."
        ),
        "sort_order": 3,
    },
]


def upgrade() -> None:
    op.create_table(
        "seminars",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_seminars_id", "seminars", ["id"])
    op.create_index("ix_seminars_published", "seminars", ["published"])
    seminars = sa.table(
        "seminars",
        sa.column("title", sa.String),
        sa.column("description", sa.Text),
        sa.column("published", sa.Boolean),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(seminars, [{**row, "published": True} for row in SEED])


def downgrade() -> None:
    op.drop_index("ix_seminars_published", table_name="seminars")
    op.drop_index("ix_seminars_id", table_name="seminars")
    op.drop_table("seminars")
