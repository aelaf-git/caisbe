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
  block_type: "text" | "video" | "pdf" | "link" | "quiz" | "assignment" | string;
  title: string | null;
  body: string | null;
  url: string | null;
  label: string | null;
  sort_order: number;
  quiz: Quiz | null;
};

export type Lesson = {
  id: number;
  title: string;
  sort_order: number;
  completed?: boolean;
  blocks: ContentBlock[];
};

export type Chapter = {
  id: number;
  title: string;
  sort_order: number;
  lessons: Lesson[];
};

export type FinalExam = {
  id: number;
  title: string;
  pass_percent: number;
  questions: QuizQuestion[];
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
};

export type QuizAttempt = {
  id: number;
  score: number;
  passed: boolean;
  certificate_code: string | null;
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
};
