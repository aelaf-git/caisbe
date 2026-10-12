"""Job posting external_id for automatic sync upserts.

Revision ID: 031_job_external_id
Revises: 030_notif_broadcasts
Create Date: 2026-10-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "031_job_external_id"
down_revision: Union[str, None] = "030_notif_broadcasts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("job_postings", sa.Column("external_id", sa.String(length=160), nullable=True))
    op.create_index("ix_job_postings_external_id", "job_postings", ["external_id"])
    op.create_index("ix_job_postings_source_label", "job_postings", ["source_label"])
    op.create_unique_constraint(
        "uq_job_source_external",
        "job_postings",
        ["source_label", "external_id"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_job_source_external", "job_postings", type_="unique")
    op.drop_index("ix_job_postings_source_label", table_name="job_postings")
    op.drop_index("ix_job_postings_external_id", table_name="job_postings")
    op.drop_column("job_postings", "external_id")
