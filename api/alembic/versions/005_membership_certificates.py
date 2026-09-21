"""Membership certificates and app settings.

Revision ID: 005_membership_certificates
Revises: 004_drop_newsletter_full_name
Create Date: 2026-09-21

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005_membership_certificates"
down_revision: Union[str, None] = "004_drop_newsletter_full_name"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "membership_certificates",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("membership_number", sa.String(length=64), nullable=False),
        sa.Column("certificate_code", sa.String(length=64), nullable=False),
        sa.Column("issued_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id"),
    )
    op.create_index("ix_membership_certificates_id", "membership_certificates", ["id"])
    op.create_index("ix_membership_certificates_user_id", "membership_certificates", ["user_id"])
    op.create_index(
        "ix_membership_certificates_membership_number",
        "membership_certificates",
        ["membership_number"],
        unique=True,
    )
    op.create_index(
        "ix_membership_certificates_certificate_code",
        "membership_certificates",
        ["certificate_code"],
        unique=True,
    )

    op.create_table(
        "app_settings",
        sa.Column("key", sa.String(length=64), nullable=False),
        sa.Column("value", sa.Text(), nullable=False),
        sa.PrimaryKeyConstraint("key"),
    )

    # Seed default settings
    settings = sa.table(
        "app_settings",
        sa.column("key", sa.String),
        sa.column("value", sa.Text),
    )
    op.bulk_insert(
        settings,
        [
            {"key": "institute_name", "value": "CAISBE"},
            {"key": "default_pass_percent", "value": "70"},
            {"key": "membership_cert_title", "value": "Certificate of Membership"},
            {"key": "completion_cert_title", "value": "Certificate of Completion"},
        ],
    )

    # Backfill membership certificates for existing students
    conn = op.get_bind()
    students = conn.execute(
        sa.text(
            "SELECT id, created_at FROM users WHERE role = 'student' ORDER BY id ASC"
        )
    ).fetchall()
    for row in students:
        user_id = row[0]
        created_at = row[1]
        membership_number = f"CAISBE-M-{user_id:06d}"
        certificate_code = f"CAISBE-MEM-{user_id:06d}"
        conn.execute(
            sa.text(
                """
                INSERT INTO membership_certificates
                    (user_id, membership_number, certificate_code, issued_at)
                VALUES
                    (:user_id, :membership_number, :certificate_code, COALESCE(:issued_at, now()))
                """
            ),
            {
                "user_id": user_id,
                "membership_number": membership_number,
                "certificate_code": certificate_code,
                "issued_at": created_at,
            },
        )


def downgrade() -> None:
    op.drop_table("app_settings")
    op.drop_index("ix_membership_certificates_certificate_code", table_name="membership_certificates")
    op.drop_index("ix_membership_certificates_membership_number", table_name="membership_certificates")
    op.drop_index("ix_membership_certificates_user_id", table_name="membership_certificates")
    op.drop_index("ix_membership_certificates_id", table_name="membership_certificates")
    op.drop_table("membership_certificates")
