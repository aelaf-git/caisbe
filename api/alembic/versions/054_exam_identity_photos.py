"""Store photo ID and face capture on exam sessions.

Revision ID: 054_exam_identity_photos
Revises: 053_communication_archive
Create Date: 2026-10-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "054_exam_identity_photos"
down_revision: Union[str, None] = "053_communication_archive"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exam_sessions", sa.Column("id_photo_url", sa.String(length=1024), nullable=True))
    op.add_column("exam_sessions", sa.Column("face_photo_url", sa.String(length=1024), nullable=True))


def downgrade() -> None:
    op.drop_column("exam_sessions", "face_photo_url")
    op.drop_column("exam_sessions", "id_photo_url")
