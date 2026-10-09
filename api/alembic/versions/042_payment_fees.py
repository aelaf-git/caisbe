"""Course prices, exam fees, and promotion kinds.

Revision ID: 042_payment_fees
Revises: 041_access_control
Create Date: 2026-10-09

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "042_payment_fees"
down_revision: Union[str, None] = "041_access_control"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("exam_fee_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("courses", sa.Column("retake_fee_cents", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(
        "order_items",
        sa.Column("item_kind", sa.String(length=16), nullable=False, server_default="course"),
    )
    op.add_column(
        "promotions",
        sa.Column("kind", sa.String(length=16), nullable=False, server_default="discount"),
    )


def downgrade() -> None:
    op.drop_column("promotions", "kind")
    op.drop_column("order_items", "item_kind")
    op.drop_column("courses", "retake_fee_cents")
    op.drop_column("courses", "exam_fee_cents")
