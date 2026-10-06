export type SupportKind = "question" | "issue" | "general";
export type SupportStatus = "open" | "waiting_admin" | "waiting_student" | "closed";

export type SupportMessage = {
  id: number;
  thread_id: number;
  sender_user_id: number;
  sender_name: string;
  body: string;
  is_from_admin: boolean;
  created_at: string;
  read_at: string | null;
};

export type SupportThread = {
  id: number;
  user_id: number;
  student_name: string;
  student_email: string;
  subject: string;
  kind: SupportKind;
  status: SupportStatus;
  created_at: string;
  updated_at: string;
  last_message_at: string;
  unread_count: number;
  last_preview: string;
  messages?: SupportMessage[];
};

export const SUPPORT_KIND_LABELS: Record<SupportKind, string> = {
  question: "Question",
  issue: "Issue",
  general: "General",
};

export const SUPPORT_STATUS_LABELS: Record<SupportStatus, string> = {
  open: "Open",
  waiting_admin: "Awaiting admin",
  waiting_student: "Awaiting student",
  closed: "Closed",
};

export function formatMessageTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
