"""Membership certificate validity periods.

Revision ID: 022_membership_validity
Revises: 021_membership_cert_types
Create Date: 2026-10-02

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "022_membership_validity"
down_revision: Union[str, None] = "021_membership_cert_types"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "membership_certificate_types",
        sa.Column("validity_months", sa.Integer(), nullable=True),
    )
    op.add_column(
        "membership_certificates",
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Student: free + lifetime. Other types: 12 months (1 year).
    op.execute(
        """
        UPDATE membership_certificate_types
        SET price_cents = 0, validity_months = NULL
        WHERE membership_type = 'student'
        """
    )
    op.execute(
        """
        UPDATE membership_certificate_types
        SET validity_months = 12
        WHERE membership_type <> 'student'
        """
    )

    # Backfill expires_at for existing non-student certificates.
    op.execute(
        """
        UPDATE membership_certificates AS mc
        SET expires_at = mc.issued_at + (COALESCE(t.validity_months, 12) || ' months')::interval
        FROM membership_certificate_types AS t
        WHERE t.membership_type = mc.membership_type
          AND mc.membership_type IS DISTINCT FROM 'student'
          AND t.validity_months IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_column("membership_certificates", "expires_at")
    op.drop_column("membership_certificate_types", "validity_months")
