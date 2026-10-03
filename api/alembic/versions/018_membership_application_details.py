"""Store the rest of the official membership application.

Revision ID: 018_membership_details
Revises: 017_news_posts
Create Date: 2026-10-01

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "018_membership_details"
down_revision: Union[str, None] = "017_news_posts"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("membership_applications", sa.Column("details", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("membership_applications", "details")
