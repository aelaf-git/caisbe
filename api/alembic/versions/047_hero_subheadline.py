"""Per-slide hero subheadline field.

Revision ID: 047_hero_subheadline
Revises: 046_hero_slide_copy
Create Date: 2026-10-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "047_hero_subheadline"
down_revision: Union[str, None] = "046_hero_slide_copy"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("media_assets", sa.Column("subheadline", sa.String(length=512), nullable=True))


def downgrade() -> None:
    op.drop_column("media_assets", "subheadline")
