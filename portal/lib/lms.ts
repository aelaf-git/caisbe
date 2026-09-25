export type QuizChoice = {
  id?: number;
  text: string;
  is_correct?: boolean;
  sort_order: number;
};

export type QuizQuestion = {
  id?: number;
  prompt: string;
  sort_order: number;
  choices: QuizChoice[];
};

export type Quiz = {
  id: number;
  title: string;
  questions: QuizQuestion[];
};

export type ContentBlock = {
  id: number;
  block_type:
    | "text"
    | "video"
    | "pdf"
    | "document"
    | "image"
    | "epub"
    | "subtopic"
    | "link"
    | "quiz"
    | "assignment"
    | "reading"
    | string;
  title: string | null;
  body: string | null;
  url: string | null;
  label: string | null;
  parent_id?: number | null;
  sort_order: number;
  completed?: boolean;
  review_status?: string | null;
  quiz: Quiz | null;
};

export type Lesson = {
  id: number;
  title: string;
  body?: string | null;
  sort_order: number;
  completed?: boolean;
  blocks: ContentBlock[];
};

export type Chapter = {
  id: number;
  title: string;
  sort_order: number;
  lessons: Lesson[];
  blocks?: ContentBlock[];
};

export type FinalExam = {
  id: number;
  title: string;
  pass_percent: number;
  time_limit_minutes: number | null;
  questions: QuizQuestion[];
};

export type ExamOrder = {
  questions: number[];
  choices: Record<string, number[]>;
};

export type ExamSessionState = {
  in_progress: boolean;
  started_at: string | null;
  remaining_seconds: number | null;
  time_limit_minutes: number | null;
  latest_score: number | null;
  latest_passed: boolean | null;
  order: ExamOrder | null;
};

export type CertificateTemplate = {
  id: number;
  title: string;
  body: string;
};

export type CourseDetail = {
  id: number;
  code: string;
  title: string;
  description: string;
  slug: string;
  status: string;
  cover_url: string | null;
  pass_percent: number;
  chapters: Chapter[];
  final_exam: FinalExam | null;
  certificate_template?: CertificateTemplate | null;
  enrolled?: boolean;
  progress?: number;
  certificate_code?: string | null;
  exam_passed?: boolean;
  exam_score?: number | null;
};

export type QuizAnswerReview = {
  question_id: number;
  selected_choice_id: number | null;
  correct_choice_id: number;
};

export type QuizAttempt = {
  id: number;
  score: number;
  passed: boolean;
  certificate_code: string | null;
  reviews?: QuizAnswerReview[];
};

export type Certificate = {
  id: number;
  certificate_code: string;
  issued_at: string;
  course: {
    id: number;
    code: string;
    title: string;
    description: string;
    slug: string;
  };
  student_name: string;
  title: string;
  body: string;
  verify_url?: string | null;
  issued_by?: string;
};

export type MembershipCertificate = {
  id: number;
  certificate_code: string;
  membership_number: string;
  issued_at: string;
  student_name: string;
  title: string;
  verify_url?: string | null;
  issued_by?: string;
};

export type CertificateVerify = {
  valid: boolean;
  kind: "completion" | "membership" | string;
  certificate_code: string;
  student_name: string;
  course_title: string | null;
  membership_number?: string | null;
  issued_at: string;
  issued_by?: string;
  verify_url?: string | null;
};
