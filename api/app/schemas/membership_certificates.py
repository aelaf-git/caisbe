from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.auth import MEMBERSHIP_TYPES


class MembershipCertificateTypeOut(BaseModel):
    id: int
    membership_type: str
    label: str
    title: str
    body: str
    price_cents: int
    currency: str
    validity_months: int | None = None
    sort_order: int
    active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MembershipCertificateTypePublicOut(BaseModel):
    """Public pricing/catalog for membership application forms."""

    membership_type: str
    label: str
    price_cents: int
    currency: str
    validity_months: int | None = None
    sort_order: int

    model_config = {"from_attributes": True}


class MembershipCertificateTypeUpdateIn(BaseModel):
    label: str | None = Field(default=None, min_length=1, max_length=120)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = Field(default=None, min_length=1, max_length=4000)
    price_cents: int | None = Field(default=None, ge=0, le=10_000_000)
    currency: str | None = Field(default=None, pattern=r"^(?i)(cad|usd)$")
    validity_months: int | None = Field(default=None, ge=1, le=1200)
    sort_order: int | None = None
    active: bool | None = None


def is_valid_membership_type(value: str) -> bool:
    return value in MEMBERSHIP_TYPES
