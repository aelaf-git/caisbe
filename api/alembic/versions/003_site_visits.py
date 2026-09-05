"""Site visit analytics.

Revision ID: 003_site_visits
Revises: 002_media_newsletter
Create Date: 2026-09-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "003_site_visits"
down_revision: Union[str, None] = "002_media_newsletter"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
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
        sa.Column("visited_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_site_visits_id"), "site_visits", ["id"], unique=False)
    op.create_index(op.f("ix_site_visits_path"), "site_visits", ["path"], unique=False)
    op.create_index(op.f("ix_site_visits_ip_address"), "site_visits", ["ip_address"], unique=False)
    op.create_index(op.f("ix_site_visits_visited_at"), "site_visits", ["visited_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_site_visits_visited_at"), table_name="site_visits")
    op.drop_index(op.f("ix_site_visits_ip_address"), table_name="site_visits")
    op.drop_index(op.f("ix_site_visits_path"), table_name="site_visits")
    op.drop_index(op.f("ix_site_visits_id"), table_name="site_visits")
    op.drop_table("site_visits")
