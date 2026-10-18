"""Seminar event details, access tokens, and registrations.

Revision ID: 050_seminar_registration
Revises: 049_leadership_people
Create Date: 2026-10-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "050_seminar_registration"
down_revision: Union[str, None] = "049_leadership_people"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

DEFAULT_DATE = "Thursday, November 12, 2026"
DEFAULT_TIME = (
    "9:00 AM – 4:00 PM Eastern Time (ET) / 8:00 AM – 3:00 PM Central Time (CT) / "
    "6:00 AM – 1:00 PM Pacific Time (PT)"
)
DEFAULT_FORMAT = (
    "Hybrid – In-person in Chicago, IL, with a live virtual option for remote attendees"
)


def upgrade() -> None:
    op.add_column("seminars", sa.Column("event_date_label", sa.String(length=255), nullable=True))
    op.add_column("seminars", sa.Column("event_time_label", sa.String(length=500), nullable=True))
    op.add_column("seminars", sa.Column("event_format_label", sa.String(length=500), nullable=True))
    op.add_column("seminars", sa.Column("event_starts_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("seminars", sa.Column("registration_closes_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "seminars",
        sa.Column("registration_enabled", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )
    op.add_column(
        "seminars",
        sa.Column("member_price_cents", sa.Integer(), nullable=False, server_default="5000"),
    )
    op.add_column(
        "seminars",
        sa.Column("non_member_price_cents", sa.Integer(), nullable=False, server_default="7500"),
    )
    op.add_column(
        "seminars",
        sa.Column("student_price_cents", sa.Integer(), nullable=False, server_default="4000"),
    )
    op.add_column("seminars", sa.Column("capacity_in_person", sa.Integer(), nullable=True))
    op.add_column("seminars", sa.Column("capacity_virtual", sa.Integer(), nullable=True))

    op.execute(
        sa.text(
            "UPDATE seminars SET event_date_label = :d, event_time_label = :t, event_format_label = :f"
        ).bindparams(d=DEFAULT_DATE, t=DEFAULT_TIME, f=DEFAULT_FORMAT)
    )

    op.create_table(
        "seminar_access_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("seminar_id", sa.Integer(), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("token_hash", sa.String(length=64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["seminar_id"], ["seminars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_hash"),
    )
    op.create_index("ix_seminar_access_tokens_id", "seminar_access_tokens", ["id"])
    op.create_index("ix_seminar_access_tokens_seminar_id", "seminar_access_tokens", ["seminar_id"])
    op.create_index("ix_seminar_access_tokens_email", "seminar_access_tokens", ["email"])
    op.create_index("ix_seminar_access_tokens_token_hash", "seminar_access_tokens", ["token_hash"])

    op.create_table(
        "seminar_registrations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("seminar_id", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("first_name", sa.String(length=120), nullable=False),
        sa.Column("last_name", sa.String(length=120), nullable=False),
        sa.Column("preferred_name", sa.String(length=120), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=60), nullable=False),
        sa.Column("job_title", sa.String(length=160), nullable=False),
        sa.Column("company", sa.String(length=200), nullable=False),
        sa.Column("city", sa.String(length=120), nullable=False),
        sa.Column("state_province", sa.String(length=120), nullable=False),
        sa.Column("country", sa.String(length=120), nullable=False),
        sa.Column("position", sa.String(length=120), nullable=False),
        sa.Column("position_other", sa.String(length=160), nullable=True),
        sa.Column("membership_status", sa.String(length=40), nullable=False),
        sa.Column("member_id", sa.String(length=80), nullable=True),
        sa.Column("earning_ceu", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("designations", sa.String(length=500), nullable=True),
        sa.Column("attendance", sa.String(length=32), nullable=False),
        sa.Column("accommodations", sa.Text(), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="usd"),
        sa.Column("stripe_session_id", sa.String(length=255), nullable=True),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["seminar_id"], ["seminars.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_seminar_registrations_id", "seminar_registrations", ["id"])
    op.create_index("ix_seminar_registrations_seminar_id", "seminar_registrations", ["seminar_id"])
    op.create_index("ix_seminar_registrations_status", "seminar_registrations", ["status"])
    op.create_index("ix_seminar_registrations_email", "seminar_registrations", ["email"])
    op.create_index(
        "ix_seminar_registrations_stripe_session_id",
        "seminar_registrations",
        ["stripe_session_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_seminar_registrations_stripe_session_id", table_name="seminar_registrations")
    op.drop_index("ix_seminar_registrations_email", table_name="seminar_registrations")
    op.drop_index("ix_seminar_registrations_status", table_name="seminar_registrations")
    op.drop_index("ix_seminar_registrations_seminar_id", table_name="seminar_registrations")
    op.drop_index("ix_seminar_registrations_id", table_name="seminar_registrations")
    op.drop_table("seminar_registrations")

    op.drop_index("ix_seminar_access_tokens_token_hash", table_name="seminar_access_tokens")
    op.drop_index("ix_seminar_access_tokens_email", table_name="seminar_access_tokens")
    op.drop_index("ix_seminar_access_tokens_seminar_id", table_name="seminar_access_tokens")
    op.drop_index("ix_seminar_access_tokens_id", table_name="seminar_access_tokens")
    op.drop_table("seminar_access_tokens")

    op.drop_column("seminars", "capacity_virtual")
    op.drop_column("seminars", "capacity_in_person")
    op.drop_column("seminars", "student_price_cents")
    op.drop_column("seminars", "non_member_price_cents")
    op.drop_column("seminars", "member_price_cents")
    op.drop_column("seminars", "registration_enabled")
    op.drop_column("seminars", "registration_closes_at")
    op.drop_column("seminars", "event_starts_at")
    op.drop_column("seminars", "event_format_label")
    op.drop_column("seminars", "event_time_label")
    op.drop_column("seminars", "event_date_label")
