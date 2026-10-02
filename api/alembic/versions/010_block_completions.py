"""Record when a student submits a chapter assignment.

Revision ID: 010_block_completions
Revises: 009_cart_items
Create Date: 2026-09-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_block_completions"
down_revision: Union[str, None] = "009_cart_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "block_completions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column(
            "content_block_id",
            sa.Integer(),
            sa.ForeignKey("content_blocks.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.UniqueConstraint("user_id", "content_block_id", name="uq_user_block_completion"),
    )
    op.create_index("ix_block_completions_user_id", "block_completions", ["user_id"])
    op.create_index("ix_block_completions_content_block_id", "block_completions", ["content_block_id"])


def downgrade() -> None:
    op.drop_index("ix_block_completions_content_block_id", table_name="block_completions")
    op.drop_index("ix_block_completions_user_id", table_name="block_completions")
    op.drop_table("block_completions")
