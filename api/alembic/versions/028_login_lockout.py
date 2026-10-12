"""Login lockout fields for brute-force defense.

Revision ID: 028_login_lockout
Revises: 027_email_verified_pw_reset
Create Date: 2026-10-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "028_login_lockout"
down_revision: Union[str, None] = "027_email_verified_pw_reset"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("failed_login_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "users",
        sa.Column("login_locked_until", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "login_locked_until")
    op.drop_column("users", "failed_login_count")
