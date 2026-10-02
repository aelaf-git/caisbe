"""Store the shuffled question and choice order for an exam attempt.

Revision ID: 013_exam_shuffle
Revises: 012_exam_time_limit
Create Date: 2026-09-25

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "013_exam_shuffle"
down_revision: Union[str, None] = "012_exam_time_limit"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("exam_sessions", sa.Column("order_json", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("exam_sessions", "order_json")
