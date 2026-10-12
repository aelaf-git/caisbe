"""Per-student portal appearance preferences on users.

Revision ID: 032_user_appearance
Revises: 031_job_external_id
Create Date: 2026-10-06

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "032_user_appearance"
down_revision: Union[str, None] = "031_job_external_id"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("ui_theme", sa.String(length=16), nullable=False, server_default="light"),
    )
    op.add_column(
        "users",
        sa.Column("ui_font_size", sa.String(length=8), nullable=False, server_default="md"),
    )
    op.add_column(
        "users",
        sa.Column("ui_font_body", sa.String(length=32), nullable=False, server_default="nunito"),
    )
    op.add_column(
        "users",
        sa.Column("ui_font_display", sa.String(length=32), nullable=False, server_default="poppins"),
    )


def downgrade() -> None:
    op.drop_column("users", "ui_font_display")
    op.drop_column("users", "ui_font_body")
    op.drop_column("users", "ui_font_size")
    op.drop_column("users", "ui_theme")
