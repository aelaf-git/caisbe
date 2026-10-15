"""Hand-written French translations for public content.

Revision ID: 045_content_translations
Revises: 044_seminars
Create Date: 2026-10-15

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "045_content_translations"
down_revision: Union[str, None] = "044_seminars"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "content_translations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("entity_type", sa.String(length=32), nullable=False),
        sa.Column("entity_id", sa.Integer(), nullable=False),
        sa.Column("lang", sa.String(length=8), nullable=False),
        sa.Column("fields", sa.JSON(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("entity_type", "entity_id", "lang", name="uq_content_translation_entity_lang"),
    )
    op.create_index("ix_content_translations_id", "content_translations", ["id"])
    op.create_index("ix_content_translations_entity_type", "content_translations", ["entity_type"])
    op.create_index("ix_content_translations_entity_id", "content_translations", ["entity_id"])
    op.create_index("ix_content_translations_lang", "content_translations", ["lang"])


def downgrade() -> None:
    op.drop_index("ix_content_translations_lang", table_name="content_translations")
    op.drop_index("ix_content_translations_entity_id", table_name="content_translations")
    op.drop_index("ix_content_translations_entity_type", table_name="content_translations")
    op.drop_index("ix_content_translations_id", table_name="content_translations")
    op.drop_table("content_translations")
