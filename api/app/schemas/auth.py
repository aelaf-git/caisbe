from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

MEMBERSHIP_TYPES = (
    "student",
    "professional",
    "corporate",
    "senior-fellow",
    "institutional",
)

MEMBERSHIP_STATUSES = ("pending", "active", "inactive")


class UserCreate(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=40)
    country: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    phone: str | None = None
    country: str | None = None
    city: str | None = None
    given_name: str | None = None
    family_name: str | None = None
    address: str | None = None
    organization: str | None = None
    job_title: str | None = None
    membership_date: datetime | None = None
    membership_type: str | None = None
    membership_status: str = "pending"
    profile_completed: bool = False
    role: str = "student"

    model_config = {"from_attributes": True}


class ProfileUpdate(BaseModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    given_name: str | None = Field(default=None, max_length=80)
    family_name: str | None = Field(default=None, max_length=80)
    phone: str | None = Field(default=None, min_length=5, max_length=40)
    country: str | None = Field(default=None, min_length=2, max_length=100)
    city: str | None = Field(default=None, min_length=2, max_length=100)
    address: str | None = Field(default=None, max_length=255)
    organization: str | None = Field(default=None, max_length=160)
    job_title: str | None = Field(default=None, max_length=120)
    membership_type: str | None = None


class PasswordChangeIn(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class SecurityQuestionIn(BaseModel):
    question: str = Field(min_length=8, max_length=255)
    answer: str = Field(min_length=2, max_length=120)


class SecurityQuestionsSaveIn(BaseModel):
    questions: list[SecurityQuestionIn] = Field(min_length=2, max_length=4)


class SecurityQuestionOut(BaseModel):
    id: int
    question: str
    sort_order: int

    model_config = {"from_attributes": True}


class SavedCardCreate(BaseModel):
    brand: str = Field(default="visa", max_length=32)
    last4: str = Field(min_length=4, max_length=4)
    exp_month: int = Field(ge=1, le=12)
    exp_year: int = Field(ge=2024, le=2100)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    stripe_payment_method_id: str | None = Field(default=None, max_length=255)


class SavedCardOut(BaseModel):
    id: int
    brand: str
    last4: str
    exp_month: int
    exp_year: int
    first_name: str
    last_name: str
    is_default: bool = False

    model_config = {"from_attributes": True}


class MembershipApplicationIn(BaseModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=5, max_length=40)
    country: str = Field(min_length=2, max_length=100)
    city: str = Field(min_length=2, max_length=100)
    address: str | None = Field(default=None, max_length=255)
    organization: str | None = Field(default=None, max_length=160)
    job_title: str | None = Field(default=None, max_length=120)
    membership_type: str = Field(min_length=2, max_length=40)


class MembershipApplicationOut(BaseModel):
    id: int
    full_name: str
    email: EmailStr
    membership_type: str
    membership_status: str
    created_at: datetime

    model_config = {"from_attributes": True}


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut
