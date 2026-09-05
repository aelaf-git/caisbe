"""Remove newsletter subscriber name.

Revision ID: 004_drop_newsletter_full_name
Revises: 003_site_visits
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "004_drop_newsletter_full_name"
down_revision: Union[str, None] = "003_site_visits"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("newsletter_subscribers", "full_name")


def downgrade() -> None:
    op.add_column(
        "newsletter_subscribers",
        sa.Column("full_name", sa.String(length=120), nullable=True),
    )
