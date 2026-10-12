"""News posts can share an external article link.

Revision ID: 043_news_external_url
Revises: 042_payment_fees
Create Date: 2026-10-12

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "043_news_external_url"
down_revision: Union[str, None] = "042_payment_fees"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "news_posts",
        sa.Column("external_url", sa.String(length=1024), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("news_posts", "external_url")
