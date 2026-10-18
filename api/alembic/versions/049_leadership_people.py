"""Leadership people for the About page.

Revision ID: 049_leadership_people
Revises: 048_news_rss_source
Create Date: 2026-10-18

"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "049_leadership_people"
down_revision: Union[str, None] = "048_news_rss_source"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEED = [
    {
        "name": "Mr. Dawit Zegeyea",
        "role": "Executive Director",
        "credentials": "MCOM, CFM, FMP, SFP, SMT",
        "email": "dawit.zegeyea@caisbe.org",
        "sort_order": 0,
    },
    {
        "name": "Mr. Ramazani Mangaals",
        "role": "Membership Development and Support",
        "credentials": "BA, FMP",
        "email": "ramazani.mangaals@caisbe.org",
        "sort_order": 1,
    },
    {
        "name": "Mr. Okey Simisola",
        "role": "East Africa Secretariat Office",
        "credentials": "BSc, MA",
        "email": "okey.simisola@caisbe.org",
        "sort_order": 2,
    },
    {
        "name": "Mr. Yared Alemu",
        "role": "Advocacy and International Relations",
        "credentials": "Dip, International Cooperation",
        "email": "yared.alemu@caisbe.org",
        "sort_order": 3,
    },
    {
        "name": "Mr. Aelaf Eskinder",
        "role": "IT Operations and Service Desk",
        "credentials": "BSc, Software Engineering",
        "email": "aelaf.eskinder@caisbe.org",
        "sort_order": 4,
    },
]


def upgrade() -> None:
    op.create_table(
        "leadership_people",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=False),
        sa.Column("role", sa.String(length=160), nullable=False),
        sa.Column("credentials", sa.String(length=255), nullable=True),
        sa.Column("bio", sa.Text(), nullable=True),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("photo_url", sa.String(length=500), nullable=True),
        sa.Column("published", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_leadership_people_id", "leadership_people", ["id"])
    op.create_index("ix_leadership_people_published", "leadership_people", ["published"])
    people = sa.table(
        "leadership_people",
        sa.column("name", sa.String),
        sa.column("role", sa.String),
        sa.column("credentials", sa.String),
        sa.column("email", sa.String),
        sa.column("published", sa.Boolean),
        sa.column("sort_order", sa.Integer),
    )
    op.bulk_insert(
        people,
        [{**row, "published": True} for row in SEED],
    )


def downgrade() -> None:
    op.drop_index("ix_leadership_people_published", table_name="leadership_people")
    op.drop_index("ix_leadership_people_id", table_name="leadership_people")
    op.drop_table("leadership_people")
