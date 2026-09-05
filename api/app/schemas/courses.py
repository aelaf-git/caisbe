from datetime import datetime

from pydantic import BaseModel, Field, model_validator


# --- Course catalog / enrollment ---


class CourseOut(BaseModel):
    id: int
    code: str
    title: str
    description: str
    slug: str
    status: str = "draft"
    cover_url: str | None = None
    pass_percent: int = 70

    model_config = {"from_attributes": True}


class CourseCreate(BaseModel):
    code: str = Field(min_length=2, max_length=32)
    title: str = Field(min_length=2, max_length=255)
    description: str = ""
    slug: str = Field(min_length=2, max_length=64)
    cover_url: str | None = None
    pass_percent: int = Field(default=70, ge=0, le=100)


class CourseUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=2, max_length=32)
    title: str | None = Field(default=None, min_length=2, max_length=255)
    description: str | None = None
    slug: str | None = Field(default=None, min_length=2, max_length=64)
    cover_url: str | None = None
    pass_percent: int | None = Field(default=None, ge=0, le=100)
    status: str | None = None


class EnrollmentOut(BaseModel):
    id: int
    status: str
    progress: int
    enrolled_at: datetime
    course: CourseOut

    model_config = {"from_attributes": True}


class EnrollmentCreate(BaseModel):
    course_id: int = Field(gt=0)


class AdminStudentEnrollmentOut(BaseModel):
    course_id: int
    course_code: str
    course_title: str
    progress: int
    status: str
    enrolled_at: datetime


class AdminStudentOut(BaseModel):
    id: int
    full_name: str
    email: str
    enrollments: list[AdminStudentEnrollmentOut] = Field(default_factory=list)


class AdminEnrollmentOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    student_email: str
    course_id: int
    course_code: str
    course_title: str
    status: str
    progress: int
    enrolled_at: datetime


class AdminEnrollmentCourseStatOut(BaseModel):
    course_id: int
    course_code: str
    course_title: str
    enrollment_count: int
    completed_count: int
    average_progress: int


class AdminEnrollmentStatsOut(BaseModel):
    total_enrollments: int
    in_progress: int
    completed: int
    not_started: int
    completion_rate: int
    new_last_30_days: int
    by_course: list[AdminEnrollmentCourseStatOut] = Field(default_factory=list)


# --- Quiz structures ---


class QuizChoiceIn(BaseModel):
    text: str = Field(min_length=1, max_length=512)
    is_correct: bool = False
    sort_order: int = 0


class QuizChoiceDraftIn(BaseModel):
    text: str = ""
    is_correct: bool = False
    sort_order: int = 0


class QuizChoiceOut(BaseModel):
    id: int
    text: str
    is_correct: bool = False
    sort_order: int = 0

    model_config = {"from_attributes": True}


class QuizChoiceStudentOut(BaseModel):
    id: int
    text: str
    sort_order: int = 0

    model_config = {"from_attributes": True}


class QuizQuestionIn(BaseModel):
    prompt: str = Field(min_length=1)
    sort_order: int = 0
    choices: list[QuizChoiceIn] = Field(min_length=2)

    @model_validator(mode="after")
    def require_one_correct_choice(self) -> "QuizQuestionIn":
        correct_count = sum(1 for choice in self.choices if choice.is_correct)
        if correct_count != 1:
            raise ValueError("Each question must mark exactly one correct answer")
        return self


class QuizQuestionDraftIn(BaseModel):
    prompt: str = ""
    sort_order: int = 0
    choices: list[QuizChoiceDraftIn] = Field(default_factory=list)


class QuizQuestionOut(BaseModel):
    id: int
    prompt: str
    sort_order: int
    choices: list[QuizChoiceOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class QuizQuestionStudentOut(BaseModel):
    id: int
    prompt: str
    sort_order: int
    choices: list[QuizChoiceStudentOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class QuizOut(BaseModel):
    id: int
    title: str
    questions: list[QuizQuestionOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class QuizStudentOut(BaseModel):
    id: int
    title: str
    questions: list[QuizQuestionStudentOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class QuizUpdate(BaseModel):
    title: str | None = None
    questions: list[QuizQuestionIn] | None = None


# --- Content blocks / lessons / chapters ---


class ContentBlockCreate(BaseModel):
    block_type: str = Field(
        pattern="^(text|video|pdf|document|image|epub|subtopic|link|quiz|assignment)$"
    )
    title: str | None = None
    body: str | None = None
    url: str | None = None
    label: str | None = None
    parent_id: int | None = None
    sort_order: int = 0
    quiz_title: str | None = "Quiz"
    quiz_questions: list[QuizQuestionIn] = Field(default_factory=list)


class ContentBlockUpdate(BaseModel):
    title: str | None = None
    body: str | None = None
    url: str | None = None
    label: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None
    quiz_title: str | None = None
    quiz_questions: list[QuizQuestionIn] | None = None


class ContentBlockOut(BaseModel):
    id: int
    block_type: str
    title: str | None
    body: str | None
    url: str | None
    label: str | None
    parent_id: int | None = None
    sort_order: int
    quiz: QuizOut | None = None

    model_config = {"from_attributes": True}


class ContentBlockStudentOut(BaseModel):
    id: int
    block_type: str
    title: str | None
    body: str | None
    url: str | None
    label: str | None
    parent_id: int | None = None
    sort_order: int
    quiz: QuizStudentOut | None = None

    model_config = {"from_attributes": True}


class BlockReorderItem(BaseModel):
    id: int
    sort_order: int


class BlockReorderRequest(BaseModel):
    items: list[BlockReorderItem] = Field(min_length=1)


class LessonCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    body: str | None = None
    sort_order: int = 0


class LessonUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    body: str | None = None
    sort_order: int | None = None


class LessonOut(BaseModel):
    id: int
    title: str
    body: str | None = None
    sort_order: int
    blocks: list[ContentBlockOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class LessonStudentOut(BaseModel):
    id: int
    title: str
    body: str | None = None
    sort_order: int
    completed: bool = False
    blocks: list[ContentBlockStudentOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ChapterCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    sort_order: int = 0


class ChapterUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    sort_order: int | None = None


class ChapterOut(BaseModel):
    id: int
    title: str
    sort_order: int
    lessons: list[LessonOut] = Field(default_factory=list)
    blocks: list[ContentBlockOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class ChapterStudentOut(BaseModel):
    id: int
    title: str
    sort_order: int
    lessons: list[LessonStudentOut] = Field(default_factory=list)
    blocks: list[ContentBlockStudentOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class FinalExamUpdate(BaseModel):
    title: str | None = None
    pass_percent: int | None = Field(default=None, ge=0, le=100)
    questions: list[QuizQuestionIn] | None = None


class FinalExamOut(BaseModel):
    id: int
    title: str
    pass_percent: int
    questions: list[QuizQuestionOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class FinalExamStudentOut(BaseModel):
    id: int
    title: str
    pass_percent: int
    questions: list[QuizQuestionStudentOut] = Field(default_factory=list)

    model_config = {"from_attributes": True}


class CertificateTemplateUpdate(BaseModel):
    title: str | None = None
    body: str | None = None


class CertificateTemplateOut(BaseModel):
    id: int
    title: str
    body: str

    model_config = {"from_attributes": True}


class CourseDetailAdminOut(CourseOut):
    chapters: list[ChapterOut] = Field(default_factory=list)
    final_exam: FinalExamOut | None = None
    certificate_template: CertificateTemplateOut | None = None


class CourseDetailStudentOut(CourseOut):
    chapters: list[ChapterStudentOut] = Field(default_factory=list)
    final_exam: FinalExamStudentOut | None = None
    enrolled: bool = False
    progress: int = 0
    certificate_code: str | None = None
    exam_passed: bool = False


class UploadOut(BaseModel):
    url: str
    filename: str


class QuizSubmitIn(BaseModel):
    answers: dict[str, int] = Field(default_factory=dict)  # question_id -> choice_id


class QuizAttemptOut(BaseModel):
    id: int
    score: int
    passed: bool
    certificate_code: str | None = None

    model_config = {"from_attributes": True}


class CertificateOut(BaseModel):
    id: int
    certificate_code: str
    issued_at: datetime
    course: CourseOut
    student_name: str
    title: str
    body: str
    verify_url: str | None = None

    model_config = {"from_attributes": True}


class CertificateVerifyOut(BaseModel):
    valid: bool = True
    certificate_code: str
    student_name: str
    course_title: str
    issued_at: datetime


class CertificateAdminOut(BaseModel):
    id: int
    certificate_code: str
    issued_at: datetime
    student_name: str
    student_email: str
    course_id: int
    course_title: str

    model_config = {"from_attributes": True}
