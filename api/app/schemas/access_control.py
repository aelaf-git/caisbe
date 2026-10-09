from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


AccessValue = Literal["allowed", "restricted"]


class AccessUserOut(BaseModel):
    id: int
    full_name: str
    email: str
    membership_type: str | None = None
    membership_status: str = "pending"
    email_verified: bool = False
    suspended: bool = False
    login_locked: bool = False


class AccessEnrollmentOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    course_id: int
    course_code: str
    course_title: str
    status: str
    progress: int
    course_access: AccessValue = "allowed"
    exam_access: AccessValue = "allowed"
    enrolled_at: datetime


class AccessRestrictionOut(BaseModel):
    kind: Literal["account", "course", "exam"]
    student_id: int
    student_name: str
    student_email: str
    enrollment_id: int | None = None
    summary: str


class LoginEventOut(BaseModel):
    id: int
    user_id: int | None = None
    email: str
    success: bool
    reason: str
    ip_address: str
    created_at: datetime

    model_config = {"from_attributes": True}


class AccessControlOut(BaseModel):
    users: list[AccessUserOut] = Field(default_factory=list)
    enrollments: list[AccessEnrollmentOut] = Field(default_factory=list)
    restrictions: list[AccessRestrictionOut] = Field(default_factory=list)
    login_events: list[LoginEventOut] = Field(default_factory=list)


class EnrollmentAccessUpdate(BaseModel):
    course_access: AccessValue | None = None
    exam_access: AccessValue | None = None


class SuspensionUpdate(BaseModel):
    suspended: bool
