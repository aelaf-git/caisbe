"""Media channels: external_url, body, nullable file_url.

Revision ID: 036_media_channels
Revises: 035_support_messaging
Create Date: 2026-10-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "036_media_channels"
down_revision: Union[str, None] = "035_support_messaging"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("media_assets", sa.Column("external_url", sa.String(length=1024), nullable=True))
    op.add_column("media_assets", sa.Column("body", sa.Text(), nullable=True))
    op.alter_column("media_assets", "file_url", existing_type=sa.String(length=1024), nullable=True)


def downgrade() -> None:
    op.execute("UPDATE media_assets SET file_url = '' WHERE file_url IS NULL")
    op.alter_column("media_assets", "file_url", existing_type=sa.String(length=1024), nullable=False)
    op.drop_column("media_assets", "body")
    op.drop_column("media_assets", "external_url")
