"""Per-slide hero text panel fields.

Revision ID: 046_hero_slide_copy
Revises: 045_content_translations
Create Date: 2026-10-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "046_hero_slide_copy"
down_revision: Union[str, None] = "045_content_translations"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "media_assets",
        sa.Column("show_text_panel", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column("media_assets", sa.Column("eyebrow", sa.String(length=120), nullable=True))
    op.add_column("media_assets", sa.Column("headline", sa.String(length=255), nullable=True))
    op.add_column("media_assets", sa.Column("cta_label", sa.String(length=120), nullable=True))
    op.add_column("media_assets", sa.Column("cta_url", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("media_assets", "cta_url")
    op.drop_column("media_assets", "cta_label")
    op.drop_column("media_assets", "headline")
    op.drop_column("media_assets", "eyebrow")
    op.drop_column("media_assets", "show_text_panel")
