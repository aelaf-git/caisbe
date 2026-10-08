"""Optional certificate program name override.

Revision ID: 039_certificate_program_name
Revises: 038_forum
Create Date: 2026-10-08

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "039_certificate_program_name"
down_revision: Union[str, None] = "038_forum"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "certificate_templates",
        sa.Column("program_name", sa.String(length=255), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("certificate_templates", "program_name")
