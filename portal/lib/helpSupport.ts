export const HELP_SECTIONS = [
  { id: "faqs", label: "FAQs" },
  { id: "technical", label: "Technical Support" },
  { id: "course", label: "Course Support" },
  { id: "certification", label: "Certification Support" },
  { id: "account", label: "Account Support" },
  { id: "contact", label: "Contact CAISBE" },
  { id: "report", label: "Report a Problem" },
] as const;

export const TECHNICAL_GROUPS = [
  {
    label: "Common Technical Problems",
    options: [
      "Cannot Log In",
      "Forgot Password",
      "Course Not Showing",
      "Cannot Open Course Material",
      "Assignment Upload Problem",
      "Exam Access Problem",
      "Certificate Download Problem",
      "Payment/Registration Problem",
    ],
  },
  {
    label: "Assignment Upload Problem",
    options: [
      "File will not upload",
      "File is too large",
      "Wrong format was uploaded",
      "Submission confirmation is not received",
    ],
  },
  {
    label: "Exam Access Problem",
    options: [
      "Cannot access exam",
      "Exam freezes",
      "Internet connection drops",
      "Exam submission problem",
      "Exam result not displayed",
    ],
  },
] as const;

export const COURSE_REQUESTS = [
  "Question about course content",
  "Cannot open course material",
  "Assignment help",
  "Progress or completion question",
  "Other",
] as const;

export const CERTIFICATION_REQUESTS = [
  "Certificate not issued",
  "Cannot download certificate",
  "Name or program name is wrong",
  "Membership certificate",
  "Other",
] as const;

export const ACCOUNT_REQUESTS = [
  "Update account details",
  "Login or password help",
  "Membership or registration",
  "Payment question",
  "Other",
] as const;

export function ticketNumber(id: number) {
  return `TKT-${String(id).padStart(5, "0")}`;
}

export function ticketSubject(area: string, topic: string) {
  return `[${area}] ${topic}`.slice(0, 255);
}

export function ticketBody(rows: { label: string; value: string }[]) {
  return rows
    .filter((row) => row.value.trim())
    .map((row) => `${row.label}: ${row.value.trim()}`)
    .join("\n");
}
