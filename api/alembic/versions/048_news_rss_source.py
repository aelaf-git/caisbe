"""News RSS source_label and unique external_url.

Revision ID: 048_news_rss_source
Revises: 047_hero_subheadline
Create Date: 2026-10-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "048_news_rss_source"
down_revision: Union[str, None] = "047_hero_subheadline"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("news_posts", sa.Column("source_label", sa.String(length=64), nullable=True))
    op.create_index("ix_news_posts_source_label", "news_posts", ["source_label"])
    # PostgreSQL and SQLite both allow multiple NULLs in a UNIQUE column.
    op.create_index(
        "uq_news_posts_external_url",
        "news_posts",
        ["external_url"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("uq_news_posts_external_url", table_name="news_posts")
    op.drop_index("ix_news_posts_source_label", table_name="news_posts")
    op.drop_column("news_posts", "source_label")
