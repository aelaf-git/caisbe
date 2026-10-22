"""Seminar venue/online fields and registration manage tokens.

Revision ID: 058_seminar_venue_manage
Revises: 057_suspension_context
Create Date: 2026-10-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "058_seminar_venue_manage"
down_revision: Union[str, None] = "057_suspension_context"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("seminars", sa.Column("venue_address", sa.Text(), nullable=True))
    op.add_column("seminars", sa.Column("online_join_url", sa.String(length=1024), nullable=True))
    op.add_column(
        "seminar_registrations",
        sa.Column("manage_token_hash", sa.String(length=64), nullable=True),
    )
    op.create_index(
        "ix_seminar_registrations_manage_token_hash",
        "seminar_registrations",
        ["manage_token_hash"],
        unique=True,
    )
    op.add_column(
        "seminar_registrations",
        sa.Column("confirmation_email_sent_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "seminar_registrations",
        sa.Column("cancelled_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("seminar_registrations", "cancelled_at")
    op.drop_column("seminar_registrations", "confirmation_email_sent_at")
    op.drop_index("ix_seminar_registrations_manage_token_hash", table_name="seminar_registrations")
    op.drop_column("seminar_registrations", "manage_token_hash")
    op.drop_column("seminars", "online_join_url")
    op.drop_column("seminars", "venue_address")
