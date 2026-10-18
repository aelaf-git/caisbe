from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

POSITION_OPTIONS = [
    "Property Manager",
    "Facility Manager",
    "Building Engineer / Systems Technician",
    "Asset Manager",
    "Portfolio Manager",
    "Sustainability / Energy Manager",
    "Operations Director",
    "Building Owner / Investor",
    "Real Estate Consultant",
    "Emerging Professional / Student",
    "Other (please specify)",
]

MEMBERSHIP_STATUSES = ("association_member", "non_member", "student")
ATTENDANCE_OPTIONS = ("in_person", "virtual")


class SeminarOut(BaseModel):
    id: int
    title: str
    description: str
    cover_url: str | None = None
    event_date_label: str | None = None
    event_time_label: str | None = None
    event_format_label: str | None = None
    event_starts_at: datetime | None = None
    registration_closes_at: datetime | None = None
    registration_enabled: bool = True
    member_price_cents: int = 5000
    non_member_price_cents: int = 7500
    student_price_cents: int = 4000
    capacity_in_person: int | None = None
    capacity_virtual: int | None = None
    published: bool
    sort_order: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SeminarCreateIn(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(min_length=1, max_length=4000)
    cover_url: str | None = Field(default=None, max_length=1024)
    event_date_label: str | None = Field(default=None, max_length=255)
    event_time_label: str | None = Field(default=None, max_length=500)
    event_format_label: str | None = Field(default=None, max_length=500)
    event_starts_at: datetime | None = None
    registration_closes_at: datetime | None = None
    registration_enabled: bool = True
    member_price_cents: int = Field(default=5000, ge=0)
    non_member_price_cents: int = Field(default=7500, ge=0)
    student_price_cents: int = Field(default=4000, ge=0)
    capacity_in_person: int | None = Field(default=None, ge=0)
    capacity_virtual: int | None = Field(default=None, ge=0)
    published: bool = True
    sort_order: int = 0


class SeminarUpdateIn(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, min_length=1, max_length=4000)
    cover_url: str | None = Field(default=None, max_length=1024)
    event_date_label: str | None = Field(default=None, max_length=255)
    event_time_label: str | None = Field(default=None, max_length=500)
    event_format_label: str | None = Field(default=None, max_length=500)
    event_starts_at: datetime | None = None
    registration_closes_at: datetime | None = None
    registration_enabled: bool | None = None
    member_price_cents: int | None = Field(default=None, ge=0)
    non_member_price_cents: int | None = Field(default=None, ge=0)
    student_price_cents: int | None = Field(default=None, ge=0)
    capacity_in_person: int | None = Field(default=None, ge=0)
    capacity_virtual: int | None = Field(default=None, ge=0)
    published: bool | None = None
    sort_order: int | None = None


class SeminarAccessRequestIn(BaseModel):
    email: EmailStr


class SeminarAccessVerifyIn(BaseModel):
    token: str = Field(min_length=10, max_length=200)


class SeminarAccessOut(BaseModel):
    email: str
    seminar_id: int
    access_token: str
    message: str


class SeminarRegistrationIn(BaseModel):
    access_token: str = Field(min_length=10, max_length=200)
    first_name: str = Field(min_length=1, max_length=120)
    last_name: str = Field(min_length=1, max_length=120)
    preferred_name: str | None = Field(default=None, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=1, max_length=60)
    job_title: str = Field(min_length=1, max_length=160)
    company: str = Field(min_length=1, max_length=200)
    city: str = Field(min_length=1, max_length=120)
    state_province: str = Field(min_length=1, max_length=120)
    country: str = Field(min_length=1, max_length=120)
    position: str = Field(min_length=1, max_length=120)
    position_other: str | None = Field(default=None, max_length=160)
    membership_status: str = Field(min_length=1, max_length=40)
    member_id: str | None = Field(default=None, max_length=80)
    earning_ceu: bool = False
    designations: str | None = Field(default=None, max_length=500)
    attendance: str = Field(min_length=1, max_length=32)
    accommodations: str | None = Field(default=None, max_length=2000)


class SeminarRegistrationOut(BaseModel):
    id: int
    seminar_id: int
    status: str
    first_name: str
    last_name: str
    preferred_name: str | None = None
    email: str
    phone: str
    job_title: str
    company: str
    city: str
    state_province: str
    country: str
    position: str
    position_other: str | None = None
    membership_status: str
    member_id: str | None = None
    earning_ceu: bool
    designations: str | None = None
    attendance: str
    accommodations: str | None = None
    amount_cents: int
    currency: str
    checkout_url: str | None = None
    paid_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class SeminarRegistrationConfirmIn(BaseModel):
    session_id: str = Field(min_length=5, max_length=255)
