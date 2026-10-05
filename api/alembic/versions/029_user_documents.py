"""User supporting documents for manage profile.

Revision ID: 029_user_documents
Revises: 028_login_lockout
Create Date: 2026-10-05

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "029_user_documents"
down_revision: Union[str, None] = "028_login_lockout"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "user_documents",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("label", sa.String(length=160), nullable=False, server_default="Supporting document"),
        sa.Column("file_name", sa.String(length=255), nullable=False),
        sa.Column("file_url", sa.String(length=1024), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_user_documents_user_id", "user_documents", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_user_documents_user_id", table_name="user_documents")
    op.drop_table("user_documents")
