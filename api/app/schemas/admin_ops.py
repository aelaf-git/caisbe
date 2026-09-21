from pydantic import BaseModel, Field


class AppSettingsOut(BaseModel):
    institute_name: str
    default_pass_percent: int
    membership_cert_title: str
    completion_cert_title: str
    portal_public_url: str


class AppSettingsUpdate(BaseModel):
    institute_name: str | None = Field(default=None, min_length=1, max_length=120)
    default_pass_percent: int | None = Field(default=None, ge=0, le=100)
    membership_cert_title: str | None = Field(default=None, min_length=1, max_length=120)
    completion_cert_title: str | None = Field(default=None, min_length=1, max_length=120)


class AdminPasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


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
