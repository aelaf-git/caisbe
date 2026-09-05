"""Media library and newsletter tables.

Revision ID: 002_media_newsletter
Revises: 001_initial_schema
Create Date: 2026-08-31

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "002_media_newsletter"
down_revision: Union[str, None] = "001_initial_schema"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "media_assets",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("file_url", sa.String(length=1024), nullable=False),
        sa.Column("cover_url", sa.String(length=1024), nullable=True),
        sa.Column("category", sa.String(length=32), nullable=False),
        sa.Column("published", sa.Boolean(), nullable=False),
        sa.Column("featured", sa.Boolean(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_media_assets_category"), "media_assets", ["category"], unique=False)
    op.create_index(op.f("ix_media_assets_id"), "media_assets", ["id"], unique=False)
    op.create_index(op.f("ix_media_assets_published"), "media_assets", ["published"], unique=False)

    op.create_table(
        "newsletter_subscribers",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=True),
        sa.Column("source", sa.String(length=64), nullable=False),
        sa.Column("subscribed_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_newsletter_subscribers_email"), "newsletter_subscribers", ["email"], unique=True)
    op.create_index(op.f("ix_newsletter_subscribers_id"), "newsletter_subscribers", ["id"], unique=False)

    op.create_table(
        "newsletter_campaigns",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("subject", sa.String(length=255), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("recipient_count", sa.Integer(), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("sent_by_id", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["sent_by_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_newsletter_campaigns_id"), "newsletter_campaigns", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_newsletter_campaigns_id"), table_name="newsletter_campaigns")
    op.drop_table("newsletter_campaigns")
    op.drop_index(op.f("ix_newsletter_subscribers_id"), table_name="newsletter_subscribers")
    op.drop_index(op.f("ix_newsletter_subscribers_email"), table_name="newsletter_subscribers")
    op.drop_table("newsletter_subscribers")
    op.drop_index(op.f("ix_media_assets_published"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_id"), table_name="media_assets")
    op.drop_index(op.f("ix_media_assets_category"), table_name="media_assets")
    op.drop_table("media_assets")
