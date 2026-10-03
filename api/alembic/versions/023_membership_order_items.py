"""Allow membership line items on orders.

Revision ID: 023_membership_order_items
Revises: 022_membership_validity
Create Date: 2026-10-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "023_membership_order_items"
down_revision: Union[str, None] = "022_membership_validity"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("order_items", "course_id", existing_type=sa.Integer(), nullable=True)
    op.add_column("order_items", sa.Column("membership_type", sa.String(length=40), nullable=True))
    op.add_column("order_items", sa.Column("membership_kind", sa.String(length=20), nullable=True))
    op.create_check_constraint(
        "ck_order_items_course_or_membership",
        "order_items",
        "(course_id IS NOT NULL AND membership_type IS NULL) OR "
        "(course_id IS NULL AND membership_type IS NOT NULL)",
    )


def downgrade() -> None:
    op.drop_constraint("ck_order_items_course_or_membership", "order_items", type_="check")
    op.drop_column("order_items", "membership_kind")
    op.drop_column("order_items", "membership_type")
    op.alter_column("order_items", "course_id", existing_type=sa.Integer(), nullable=False)
