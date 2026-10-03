"""Optional final-exam questions_to_appear (random subset per attempt).

Revision ID: 025_exam_questions_to_appear
Revises: 024_course_delete_notifications
Create Date: 2026-10-03

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "025_exam_questions_to_appear"
down_revision: Union[str, None] = "024_course_delete_notifications"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("final_exams", sa.Column("questions_to_appear", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("final_exams", "questions_to_appear")
