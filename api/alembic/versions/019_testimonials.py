"""Homepage testimonials.

Revision ID: 019_testimonials
Revises: 018_membership_details
Create Date: 2026-10-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "019_testimonials"
down_revision: Union[str, None] = "018_membership_details"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED = [
    {
        "quote": "I had no idea what facility management really was until this course. In just 8 weeks, it opened my eyes to an exciting career I never considered. Perfect starting point!",
        "name": "Alice Howard",
        "role": "Course Participant",
        "sort_order": 0,
    },
    {
        "quote": "As a complete beginner, this intro course was exactly what I needed. Clear, practical, and engaging – now I'm enrolled in the full certification program!",
        "name": "Nathan Marshall",
        "role": "Admin Assistant",
        "sort_order": 1,
    },
    {
        "quote": "This course took me from 'doing the job' to truly leading it. Mastering budgeting, vendor contracts, and risk management got me the opportunity to be promoted.",
        "name": "Ema Romero",
        "role": "Architect",
        "sort_order": 2,
    },
    {
        "quote": "Perfect mid-career boost. Learned CAFM systems, emergency preparedness, and how to present to the C-suite. A great asset for future success.",
        "name": "Wanjiku Cole",
        "role": "Manager",
        "sort_order": 3,
    },
]


def upgrade() -> None:
    op.create_table(
        "testimonials",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("quote", sa.Text(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=160), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_testimonials_id", "testimonials", ["id"])
    op.create_index("ix_testimonials_published", "testimonials", ["published"])
    testimonials = sa.table(
        "testimonials",
        sa.column("quote", sa.Text),
        sa.column("name", sa.String),
        sa.column("role", sa.String),
        sa.column("published", sa.Boolean),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(
        testimonials,
        [{**row, "published": True} for row in SEED],
    )


def downgrade() -> None:
    op.drop_index("ix_testimonials_published", table_name="testimonials")
    op.drop_index("ix_testimonials_id", table_name="testimonials")
    op.drop_table("testimonials")
