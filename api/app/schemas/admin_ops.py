from typing import Literal

from pydantic import BaseModel, Field, field_validator

from app.security.passwords import MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, validate_password_strength

ThemeChoice = Literal["light", "dark"]
FontSizeChoice = Literal["sm", "md", "lg", "xl"]
FontChoice = Literal[
    "nunito",
    "poppins",
    "roboto",
    "open-sans",
    "inter",
    "source-sans",
    "merriweather",
    "source-serif",
]


class AppSettingsOut(BaseModel):
    institute_name: str
    default_pass_percent: int
    membership_cert_title: str
    completion_cert_title: str
    portal_public_url: str
    ui_theme: ThemeChoice
    ui_font_size: FontSizeChoice
    ui_font_body: FontChoice
    ui_font_display: FontChoice
    hero_transition_ms: int = 3000


class AppSettingsUpdate(BaseModel):
    institute_name: str | None = Field(default=None, min_length=1, max_length=120)
    default_pass_percent: int | None = Field(default=None, ge=0, le=100)
    membership_cert_title: str | None = Field(default=None, min_length=1, max_length=120)
    completion_cert_title: str | None = Field(default=None, min_length=1, max_length=120)
    ui_theme: ThemeChoice | None = None
    ui_font_size: FontSizeChoice | None = None
    ui_font_body: FontChoice | None = None
    ui_font_display: FontChoice | None = None
    hero_transition_ms: int | None = Field(default=None, ge=1000, le=60_000)


class AdminPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=MAX_PASSWORD_LENGTH)
    new_password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=MAX_PASSWORD_LENGTH)

    @field_validator("new_password")
    @classmethod
    def strong_new_password(cls, value: str) -> str:
        try:
            return validate_password_strength(value)
        except ValueError as exc:
            raise ValueError(str(exc)) from exc


class CourseReportRow(BaseModel):
    course_id: int
    course_code: str
    course_title: str
    enrollments: int
    completed: int
    completion_percent: int
    certificates_issued: int


class AdminReportsOut(BaseModel):
    students: int
    total_enrollments: int
    enrollments_completed: int
    enrollments_in_progress: int
    completion_rate: int
    membership_certificates: int
    completion_certificates: int
    quiz_attempts: int
    quiz_passed: int
    courses: list[CourseReportRow] = Field(default_factory=list)
