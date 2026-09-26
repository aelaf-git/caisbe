"""News and announcements posts.

Revision ID: 017_news_posts
Revises: 016_drop_cpd_activities
Create Date: 2026-09-26

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "017_news_posts"
down_revision: Union[str, None] = "016_drop_cpd_activities"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "news_posts",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("slug", sa.String(length=280), nullable=False),
        sa.Column("short_description", sa.Text(), nullable=True),
        sa.Column("long_description", sa.Text(), nullable=True),
        sa.Column("cover_url", sa.String(length=1024), nullable=True),
        sa.Column("image_urls", sa.JSON(), nullable=True),
        sa.Column("video_urls", sa.JSON(), nullable=True),
        sa.Column("tag", sa.String(length=64), nullable=True),
        sa.Column("posted_on", sa.DateTime(timezone=True), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("featured", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_index("ix_news_posts_id", "news_posts", ["id"])
    op.create_index("ix_news_posts_slug", "news_posts", ["slug"], unique=True)
    op.create_index("ix_news_posts_published", "news_posts", ["published"])
    op.create_index("ix_news_posts_posted_on", "news_posts", ["posted_on"])


def downgrade() -> None:
    op.drop_index("ix_news_posts_posted_on", table_name="news_posts")
    op.drop_index("ix_news_posts_published", table_name="news_posts")
    op.drop_index("ix_news_posts_slug", table_name="news_posts")
    op.drop_index("ix_news_posts_id", table_name="news_posts")
    op.drop_table("news_posts")
