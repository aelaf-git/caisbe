"""Job board postings with upload and expiry dates.

Revision ID: 015_job_postings
Revises: 014_industry_events_cpd
Create Date: 2026-09-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "015_job_postings"
down_revision: Union[str, None] = "014_industry_events_cpd"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "job_postings",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("company", sa.String(length=160), nullable=True),
        sa.Column("location", sa.String(length=255), nullable=True),
        sa.Column("employment_type", sa.String(length=64), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("apply_url", sa.String(length=1024), nullable=True),
        sa.Column("attachment_url", sa.String(length=1024), nullable=True),
        sa.Column("source_label", sa.String(length=64), nullable=True),
        sa.Column("posted_on", sa.DateTime(timezone=True), nullable=False),
        sa.Column("expires_on", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_job_postings_id", "job_postings", ["id"])
    op.create_index("ix_job_postings_published", "job_postings", ["published"])
    op.create_index("ix_job_postings_posted_on", "job_postings", ["posted_on"])
    op.create_index("ix_job_postings_expires_on", "job_postings", ["expires_on"])


def downgrade() -> None:
    op.drop_index("ix_job_postings_expires_on", table_name="job_postings")
    op.drop_index("ix_job_postings_posted_on", table_name="job_postings")
    op.drop_index("ix_job_postings_published", table_name="job_postings")
    op.drop_index("ix_job_postings_id", table_name="job_postings")
    op.drop_table("job_postings")
