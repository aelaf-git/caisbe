"""Course pricing, checkout, profile, and membership applications.

Revision ID: 008_commerce_profile
Revises: 007_course_draft_meta
Create Date: 2026-09-22

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "008_commerce_profile"
down_revision: Union[str, None] = "007_course_draft_meta"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column("price_cents", sa.Integer(), nullable=False, server_default="9900"),
    )
    op.add_column(
        "courses",
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="usd"),
    )

    op.add_column("users", sa.Column("given_name", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("family_name", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("address", sa.String(length=255), nullable=True))
    op.add_column("users", sa.Column("organization", sa.String(length=160), nullable=True))
    op.add_column("users", sa.Column("job_title", sa.String(length=120), nullable=True))
    op.add_column("users", sa.Column("membership_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("membership_type", sa.String(length=40), nullable=True))
    op.add_column(
        "users",
        sa.Column("membership_status", sa.String(length=32), nullable=False, server_default="pending"),
    )
    op.add_column("users", sa.Column("profile_completed_at", sa.DateTime(timezone=True), nullable=True))

    op.create_table(
        "promotions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=False, server_default=""),
        sa.Column("percent_off", sa.Integer(), nullable=True),
        sa.Column("amount_off_cents", sa.Integer(), nullable=True),
        sa.Column("complimentary", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("max_redemptions", sa.Integer(), nullable=True),
        sa.Column("redemption_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id", ondelete="SET NULL"), nullable=True),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_promotions_code", "promotions", ["code"], unique=True)

    op.create_table(
        "orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(length=40), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("subtotal_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("discount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amount_paid_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="usd"),
        sa.Column("promotion_id", sa.Integer(), sa.ForeignKey("promotions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("promo_code", sa.String(length=40), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_orders_number", "orders", ["number"], unique=True)
    op.create_index("ix_orders_user_id", "orders", ["user_id"])

    op.create_table(
        "order_items",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("course_id", sa.Integer(), sa.ForeignKey("courses.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("unit_price_cents", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
    )
    op.create_index("ix_order_items_order_id", "order_items", ["order_id"])

    op.create_table(
        "invoices",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("number", sa.String(length=40), nullable=False),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("bill_date", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("period_start", sa.DateTime(timezone=True), nullable=True),
        sa.Column("period_end", sa.DateTime(timezone=True), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("amount_paid_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("balance_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="open"),
    )
    op.create_index("ix_invoices_number", "invoices", ["number"], unique=True)
    op.create_index("ix_invoices_user_id", "invoices", ["user_id"])

    op.create_table(
        "payments",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("order_id", sa.Integer(), sa.ForeignKey("orders.id", ondelete="CASCADE"), nullable=False),
        sa.Column("invoice_id", sa.Integer(), sa.ForeignKey("invoices.id", ondelete="SET NULL"), nullable=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("provider", sa.String(length=32), nullable=False, server_default="stripe"),
        sa.Column("stripe_session_id", sa.String(length=255), nullable=True),
        sa.Column("stripe_payment_intent_id", sa.String(length=255), nullable=True),
        sa.Column("amount_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("receipt_printed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("reviewed_by_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_payments_user_id", "payments", ["user_id"])
    op.create_index("ix_payments_stripe_session_id", "payments", ["stripe_session_id"], unique=False)

    op.create_table(
        "saved_cards",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stripe_payment_method_id", sa.String(length=255), nullable=True),
        sa.Column("brand", sa.String(length=32), nullable=False, server_default="card"),
        sa.Column("last4", sa.String(length=4), nullable=False),
        sa.Column("exp_month", sa.Integer(), nullable=False),
        sa.Column("exp_year", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("last_name", sa.String(length=80), nullable=False, server_default=""),
        sa.Column("is_default", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_saved_cards_user_id", "saved_cards", ["user_id"])

    op.create_table(
        "security_questions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("question", sa.String(length=255), nullable=False),
        sa.Column("answer_hash", sa.String(length=255), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )
    op.create_index("ix_security_questions_user_id", "security_questions", ["user_id"])

    op.create_table(
        "membership_applications",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("phone", sa.String(length=40), nullable=False),
        sa.Column("country", sa.String(length=100), nullable=False),
        sa.Column("city", sa.String(length=100), nullable=False),
        sa.Column("address", sa.String(length=255), nullable=True),
        sa.Column("organization", sa.String(length=160), nullable=True),
        sa.Column("job_title", sa.String(length=120), nullable=True),
        sa.Column("membership_type", sa.String(length=40), nullable=False),
        sa.Column("membership_status", sa.String(length=32), nullable=False, server_default="pending"),
        sa.Column("membership_date", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_index("ix_membership_applications_email", "membership_applications", ["email"])

    promotions = sa.table(
        "promotions",
        sa.column("code", sa.String),
        sa.column("description", sa.String),
        sa.column("percent_off", sa.Integer),
        sa.column("complimentary", sa.Boolean),
        sa.column("max_redemptions", sa.Integer),
        sa.column("redemption_count", sa.Integer),
        sa.column("active", sa.Boolean),
    )
    op.bulk_insert(
        promotions,
        [
            {
                "code": "WELCOME10",
                "description": "10% off your first course",
                "percent_off": 10,
                "complimentary": False,
                "max_redemptions": None,
                "redemption_count": 0,
                "active": True,
            },
            {
                "code": "CAISBE100",
                "description": "Complimentary enrollment",
                "percent_off": 100,
                "complimentary": True,
                "max_redemptions": 500,
                "redemption_count": 0,
                "active": True,
            },
        ],
    )


def downgrade() -> None:
    op.drop_table("membership_applications")
    op.drop_table("security_questions")
    op.drop_table("saved_cards")
    op.drop_table("payments")
    op.drop_table("invoices")
    op.drop_table("order_items")
    op.drop_table("orders")
    op.drop_table("promotions")
    op.drop_column("users", "profile_completed_at")
    op.drop_column("users", "membership_status")
    op.drop_column("users", "membership_type")
    op.drop_column("users", "membership_date")
    op.drop_column("users", "job_title")
    op.drop_column("users", "organization")
    op.drop_column("users", "address")
    op.drop_column("users", "family_name")
    op.drop_column("users", "given_name")
    op.drop_column("courses", "currency")
    op.drop_column("courses", "price_cents")
