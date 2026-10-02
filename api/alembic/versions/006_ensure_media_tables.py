"""Create media, newsletter, and site-visit tables if a prior stamp skipped them.

Revision ID: 006_ensure_media_tables
Revises: 005_membership_certificates
Create Date: 2026-09-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy import inspect

revision: str = "006_ensure_media_tables"
down_revision: Union[str, None] = "005_membership_certificates"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = inspect(bind)
    tables = set(inspector.get_table_names())

    if "media_assets" not in tables:
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
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_media_assets_category", "media_assets", ["category"], unique=False)
        op.create_index("ix_media_assets_id", "media_assets", ["id"], unique=False)
        op.create_index("ix_media_assets_published", "media_assets", ["published"], unique=False)

    if "newsletter_subscribers" not in tables:
        op.create_table(
            "newsletter_subscribers",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("email", sa.String(length=255), nullable=False),
            sa.Column("source", sa.String(length=64), nullable=False),
            sa.Column(
                "subscribed_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("unsubscribed_at", sa.DateTime(timezone=True), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_newsletter_subscribers_email",
            "newsletter_subscribers",
            ["email"],
            unique=True,
        )
        op.create_index("ix_newsletter_subscribers_id", "newsletter_subscribers", ["id"], unique=False)

    if "newsletter_campaigns" not in tables:
        op.create_table(
            "newsletter_campaigns",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("subject", sa.String(length=255), nullable=False),
            sa.Column("body_html", sa.Text(), nullable=False),
            sa.Column("recipient_count", sa.Integer(), nullable=False),
            sa.Column(
                "sent_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.Column("sent_by_id", sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(["sent_by_id"], ["users.id"], ondelete="SET NULL"),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_newsletter_campaigns_id", "newsletter_campaigns", ["id"], unique=False)

    if "site_visits" not in tables:
        op.create_table(
            "site_visits",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("path", sa.String(length=512), nullable=False),
            sa.Column("ip_address", sa.String(length=64), nullable=False),
            sa.Column("country", sa.String(length=64), nullable=True),
            sa.Column("city", sa.String(length=120), nullable=True),
            sa.Column("referrer", sa.String(length=1024), nullable=True),
            sa.Column("user_agent", sa.String(length=512), nullable=True),
            sa.Column("language", sa.String(length=64), nullable=True),
            sa.Column("timezone", sa.String(length=64), nullable=True),
            sa.Column(
                "visited_at",
                sa.DateTime(timezone=True),
                server_default=sa.text("now()"),
                nullable=False,
            ),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_site_visits_id", "site_visits", ["id"], unique=False)
        op.create_index("ix_site_visits_path", "site_visits", ["path"], unique=False)
        op.create_index("ix_site_visits_ip_address", "site_visits", ["ip_address"], unique=False)
        op.create_index("ix_site_visits_visited_at", "site_visits", ["visited_at"], unique=False)


def downgrade() -> None:
    # Do not drop tables that may have been created by earlier revisions on a healthy DB.
    return
