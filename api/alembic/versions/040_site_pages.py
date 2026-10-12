"""Editable public landing pages.

Revision ID: 040_site_pages
Revises: 039_certificate_program_name
Create Date: 2026-10-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "040_site_pages"
down_revision: Union[str, None] = "039_certificate_program_name"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "site_pages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("parent_id", sa.Integer(), nullable=True),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("menu_label", sa.String(length=120), nullable=False),
        sa.Column("slug", sa.String(length=80), nullable=False),
        sa.Column("path", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False, server_default=""),
        sa.Column("lead", sa.Text(), nullable=False, server_default=""),
        sa.Column("sections", sa.JSON(), nullable=False),
        sa.Column("cta_label", sa.String(length=120), nullable=True),
        sa.Column("cta_href", sa.String(length=500), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("show_in_menu", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="draft"),
        sa.ForeignKeyConstraint(["parent_id"], ["site_pages.id"], ondelete="RESTRICT"),
    )
    op.create_index("ix_site_pages_id", "site_pages", ["id"])
    op.create_index("ix_site_pages_parent_id", "site_pages", ["parent_id"])
    op.create_index("ix_site_pages_path", "site_pages", ["path"], unique=True)
    op.create_index("ix_site_pages_status", "site_pages", ["status"])


def downgrade() -> None:
    op.drop_index("ix_site_pages_status", table_name="site_pages")
    op.drop_index("ix_site_pages_path", table_name="site_pages")
    op.drop_index("ix_site_pages_parent_id", table_name="site_pages")
    op.drop_index("ix_site_pages_id", table_name="site_pages")
    op.drop_table("site_pages")
