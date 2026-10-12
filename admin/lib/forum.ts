export type ForumBoardSummary = {
  id: number;
  slug: string;
  title: string;
  description: string;
  member_can_start: boolean;
  sort_order: number;
  thread_count: number;
  last_activity_at: string | null;
  last_thread_title: string | null;
};

export type ForumCategory = {
  id: number;
  slug: string;
  title: string;
  sort_order: number;
  boards: ForumBoardSummary[];
};

export type ForumAdminThreadSummary = {
  id: number;
  title: string;
  author_name: string;
  author_email: string;
  board_slug: string;
  board_title: string;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  reply_count: number;
  created_at: string;
  last_activity_at: string;
};

export type ForumReply = {
  id: number;
  author_name: string;
  body: string;
  hidden: boolean;
  created_at: string;
};

export type ForumAdminThreadDetail = {
  id: number;
  board_slug: string;
  board_title: string;
  category_title: string;
  title: string;
  body: string;
  author_name: string;
  author_email: string;
  pinned: boolean;
  locked: boolean;
  hidden: boolean;
  member_can_start: boolean;
  created_at: string;
  last_activity_at: string;
  replies: ForumReply[];
};

export function formatForumTime(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
