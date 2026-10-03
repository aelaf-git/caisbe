"""Membership certificate types with prices.

Revision ID: 021_membership_cert_types
Revises: 020_contact_messages
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "021_membership_cert_types"
down_revision: Union[str, None] = "020_contact_messages"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED = [
    {
        "membership_type": "student",
        "label": "Student Membership",
        "title": "Certificate of Student Membership",
        "body": "is a recognised Student member of {issued_by}, admitted on {issued_at}.",
        "price_cents": 5000,
        "currency": "cad",
        "sort_order": 0,
    },
    {
        "membership_type": "professional",
        "label": "Professional Membership",
        "title": "Certificate of Professional Membership",
        "body": "is a recognised Professional member of {issued_by}, admitted on {issued_at}.",
        "price_cents": 10000,
        "currency": "cad",
        "sort_order": 1,
    },
    {
        "membership_type": "corporate",
        "label": "Corporate Membership",
        "title": "Certificate of Corporate Membership",
        "body": "is a recognised Corporate member of {issued_by}, admitted on {issued_at}.",
        "price_cents": 10000,
        "currency": "cad",
        "sort_order": 2,
    },
    {
        "membership_type": "senior-fellow",
        "label": "Senior Member / Fellow",
        "title": "Certificate of Senior Membership",
        "body": "is a recognised Senior Member / Fellow of {issued_by}, admitted on {issued_at}.",
        "price_cents": 10000,
        "currency": "cad",
        "sort_order": 3,
    },
    {
        "membership_type": "institutional",
        "label": "Institutional Member",
        "title": "Certificate of Institutional Membership",
        "body": "is a recognised Institutional member of {issued_by}, admitted on {issued_at}.",
        "price_cents": 10000,
        "currency": "cad",
        "sort_order": 4,
    },
]


def upgrade() -> None:
    op.add_column(
        "membership_certificates",
        sa.Column("membership_type", sa.String(length=40), nullable=True),
    )
    op.create_index(
        "ix_membership_certificates_membership_type",
        "membership_certificates",
        ["membership_type"],
    )

    op.create_table(
        "membership_certificate_types",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("membership_type", sa.String(length=40), nullable=False),
        sa.Column("label", sa.String(length=120), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("currency", sa.String(length=8), nullable=False, server_default="cad"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("membership_type"),
    )
    op.create_index("ix_membership_certificate_types_id", "membership_certificate_types", ["id"])
    op.create_index(
        "ix_membership_certificate_types_membership_type",
        "membership_certificate_types",
        ["membership_type"],
    )

    types = sa.table(
        "membership_certificate_types",
        sa.column("membership_type", sa.String),
        sa.column("label", sa.String),
        sa.column("title", sa.String),
        sa.column("body", sa.Text),
        sa.column("price_cents", sa.Integer),
        sa.column("currency", sa.String),
        sa.column("sort_order", sa.Integer),
        sa.column("active", sa.Boolean),
    )
    op.bulk_insert(types, [{**row, "active": True} for row in SEED])

    # Backfill issued certificates from the member's current type when available.
    op.execute(
        """
        UPDATE membership_certificates AS mc
        SET membership_type = u.membership_type
        FROM users AS u
        WHERE mc.user_id = u.id
          AND u.membership_type IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index(
        "ix_membership_certificate_types_membership_type",
        table_name="membership_certificate_types",
    )
    op.drop_index("ix_membership_certificate_types_id", table_name="membership_certificate_types")
    op.drop_table("membership_certificate_types")
    op.drop_index("ix_membership_certificates_membership_type", table_name="membership_certificates")
    op.drop_column("membership_certificates", "membership_type")
