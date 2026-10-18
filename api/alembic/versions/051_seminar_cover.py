"""Add seminar cover_url for homepage cards.

Revision ID: 051_seminar_cover
Revises: 050_seminar_registration
Create Date: 2026-10-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "051_seminar_cover"
down_revision: Union[str, None] = "050_seminar_registration"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("seminars", sa.Column("cover_url", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("seminars", "cover_url")
