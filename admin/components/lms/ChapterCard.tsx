"use client";

import { FormEvent, useState } from "react";
import QuizQuestionEditor, {
  emptyQuestion,
  validateQuestions,
} from "@/components/lms/QuizQuestionEditor";
import TopicContentEditor from "@/components/lms/TopicContentEditor";
import { CollapseToggle } from "@/components/ui/CollapseToggle";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, ApiError } from "@/lib/auth";
import { numberedTitle } from "@/lib/ordinalTitles";
import type { Chapter, ContentBlock, QuizQuestion } from "@/lib/lms";

type Tab = "content" | "quizzes" | "assignments";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

type ChapterCardProps = {
  chapter: Chapter;
  sequence: number;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

function RequiredDot() {
  return (
    <span
      className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-caisbe-red align-middle"
      aria-hidden
    />
  );
}

export default function ChapterCard({ chapter, sequence, onChanged, onError }: ChapterCardProps) {
  const { confirm, dialog } = useConfirmDialog();
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("content");
  const [title, setTitle] = useState(chapter.title);
  const [busy, setBusy] = useState(false);

  const chapterBlocks = chapter.blocks ?? [];
  const quizzes = chapterBlocks.filter((b) => b.block_type === "quiz");
  const assignments = chapterBlocks.filter((b) => b.block_type === "assignment");

  const titleAutosave = useAutosave({
    id: `chapter-${chapter.id}-title`,
    value: title,
    baselineKey: chapter.id,
    enabled: title.trim().length >= 1,
    save: async (next) => {
      const trimmed = next.trim();
      if (!trimmed) return;
      try {
        await apiFetch(`/admin/chapters/${chapter.id}`, {
          method: "PATCH",
          body: JSON.stringify({ title: trimmed }),
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : "Unable to rename chapter.";
        onError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
  });

  async function deleteChapter() {
    const ok = await confirm({
      title: "Delete chapter?",
      description: `Delete Chapter - ${sequence}${chapter.title ? ` (“${chapter.title}”)` : ""}? This removes all topics, quizzes, and assignments in this chapter.`,
      confirmLabel: "Delete chapter",
    });
    if (!ok) return;
    setBusy(true);
    try {
      await apiFetch(`/admin/chapters/${chapter.id}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete chapter.");
    } finally {
      setBusy(false);
    }
  }

  async function addTopic() {
    setBusy(true);
    try {
      await apiFetch(`/admin/chapters/${chapter.id}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title: numberedTitle("Topic", chapter.lessons.length),
          body: "",
          sort_order: chapter.lessons.length,
        }),
      });
      setExpanded(true);
      setTab("content");
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to add topic.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border border-ifma-border bg-white">
      {dialog}
      <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4">
        <div className="flex min-w-0 flex-1 items-start gap-1">
          <CollapseToggle
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
            label={`Chapter - ${sequence}`}
            className="mt-0.5"
          />
          <div className="min-w-0 flex-1 space-y-3">
            <p className="text-sm font-semibold uppercase tracking-wide text-caisbe-red">
              Chapter - {sequence}
            </p>
            <div>
              <label className="mb-1 flex items-center text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Title
                <RequiredDot />
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => void titleAutosave.flush()}
                placeholder="Enter chapter title"
                className="h-11 w-full max-w-xl rounded-md border border-ifma-border px-3 text-sm font-semibold outline-none focus:border-caisbe-green"
              />
            </div>
            {!expanded ? (
              <p className="text-xs text-caisbe-muted">
                {chapter.lessons.length} topic{chapter.lessons.length === 1 ? "" : "s"}
                {quizzes.length ? ` · ${quizzes.length} quiz${quizzes.length === 1 ? "" : "zes"}` : ""}
                {assignments.length
                  ? ` · ${assignments.length} assignment${assignments.length === 1 ? "" : "s"}`
                  : ""}
              </p>
            ) : null}
          </div>
        </div>
        <DeleteIconButton
          label="Delete chapter"
          disabled={busy}
          onClick={() => void deleteChapter()}
        />
      </div>

      {expanded ? (
        <>
          <div className="flex flex-wrap items-center gap-2 border-t border-ifma-border-light px-4 py-3">
            {(
              [
                ["content", "Content", true],
                ["quizzes", "Quizzes", false],
                ["assignments", "Assignments", false],
              ] as const
            ).map(([key, label, required]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center rounded-md px-3 py-2 text-sm font-medium ${
                  tab === key
                    ? "bg-caisbe-green/10 text-caisbe-green"
                    : "text-caisbe-muted hover:bg-ifma-border-light"
                }`}
              >
                {label}
                {required ? <RequiredDot /> : null}
              </button>
            ))}
          </div>

          <div className="border-t border-ifma-border-light p-4">
            {tab === "content" ? (
              <ContentPanel
                chapter={chapter}
                onAddTopic={() => void addTopic()}
                onChanged={onChanged}
                onError={onError}
                askConfirm={confirm}
                busy={busy}
              />
            ) : null}
            {tab === "quizzes" ? (
              <QuizzesPanel
                chapter={chapter}
                quizzes={quizzes}
                onChanged={onChanged}
                onError={onError}
                askConfirm={confirm}
              />
            ) : null}
            {tab === "assignments" ? (
              <AssignmentsPanel
                chapter={chapter}
                assignments={assignments}
                onChanged={onChanged}
                onError={onError}
                askConfirm={confirm}
              />
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  );
}

function ContentPanel({
  chapter,
  onAddTopic,
  onChanged,
  onError,
  askConfirm,
  busy,
}: {
  chapter: Chapter;
  onAddTopic: () => void;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
  busy: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-caisbe-muted">
          Add topics, then stack text and subtopic blocks. Uploads attach under a block.
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={onAddTopic}
          className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green hover:bg-caisbe-green/5"
        >
          + Add topic
        </button>
      </div>

      {chapter.lessons.length === 0 ? (
        <p className="rounded-md border border-dashed border-ifma-border px-4 py-6 text-sm text-caisbe-muted">
          No topics yet. Add a topic to start building this chapter&apos;s content.
        </p>
      ) : (
        <div className="space-y-3">
          {chapter.lessons.map((topic) => (
            <TopicContentEditor
              key={topic.id}
              topic={topic}
              onChanged={onChanged}
              onError={onError}
              askConfirm={askConfirm}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuizzesPanel({
  chapter,
  quizzes,
  onChanged,
  onError,
  askConfirm,
}: {
  chapter: Chapter;
  quizzes: ContentBlock[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("Quiz");
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveQuiz(event: FormEvent) {
    event.preventDefault();
    const invalid = validateQuestions(questions);
    if (invalid) {
      setError(invalid);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/admin/chapters/${chapter.id}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: "quiz",
          title,
          quiz_title: title,
          quiz_questions: questions,
          sort_order: (chapter.blocks ?? []).length,
        }),
      });
      setOpen(false);
      setTitle("Quiz");
      setQuestions([emptyQuestion()]);
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save quiz.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteQuiz(block: ContentBlock) {
    const label = block.title || block.quiz?.title || "Quiz";
    const ok = await askConfirm({
      title: "Delete quiz?",
      description: `Delete quiz “${label}”?`,
      confirmLabel: "Delete quiz",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/blocks/${block.id}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete quiz.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-caisbe-muted">Optional chapter quizzes for learners.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green"
        >
          {open ? "Cancel" : "+ Add quiz"}
        </button>
      </div>

      {quizzes.length === 0 && !open ? (
        <p className="text-sm text-caisbe-muted">No quizzes yet.</p>
      ) : (
        <ul className="space-y-2">
          {quizzes.map((block) => (
            <QuizListItem key={block.id} block={block} onDelete={() => void deleteQuiz(block)} />
          ))}
        </ul>
      )}

      {open ? (
        <form onSubmit={saveQuiz} className="space-y-3 border border-ifma-border p-4">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
            placeholder="Quiz title"
          />
          <QuizQuestionEditor
            questions={questions}
            onChange={setQuestions}
            radioNamePrefix={`chapter-${chapter.id}-quiz`}
            error={error}
          />
          <button
            type="submit"
            disabled={saving}
            className="border-2 border-caisbe-green bg-caisbe-green px-4 py-2 text-sm font-semibold uppercase text-white disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add quiz"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function QuizListItem({ block, onDelete }: { block: ContentBlock; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const questionCount = block.quiz?.questions.length ?? 0;

  return (
    <li className="border border-ifma-border-light">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        <CollapseToggle
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          label={block.title || block.quiz?.title || "quiz"}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-caisbe-text">{block.title || block.quiz?.title || "Quiz"}</p>
          <p className="text-xs text-caisbe-muted">{questionCount} questions</p>
        </div>
        <DeleteIconButton
          label={`Delete quiz ${block.title || block.quiz?.title || ""}`.trim()}
          onClick={onDelete}
        />
      </div>
      {expanded ? (
        <ul className="space-y-1 border-t border-ifma-border-light px-4 py-3 text-sm text-caisbe-muted">
          {(block.quiz?.questions ?? []).map((q, idx) => (
            <li key={q.id ?? idx}>
              {idx + 1}. {q.prompt}
            </li>
          ))}
          {questionCount === 0 ? <li>No questions.</li> : null}
        </ul>
      ) : null}
    </li>
  );
}

function AssignmentsPanel({
  chapter,
  assignments,
  onChanged,
  onError,
  askConfirm,
}: {
  chapter: Chapter;
  assignments: ContentBlock[];
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  askConfirm: AskConfirm;
}) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);

  async function saveAssignment(event: FormEvent) {
    event.preventDefault();
    if (!title.trim() || !body.trim()) {
      onError("Assignment title and prompt are required.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch(`/admin/chapters/${chapter.id}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: "assignment",
          title: title.trim(),
          body,
          sort_order: (chapter.blocks ?? []).length,
        }),
      });
      setOpen(false);
      setTitle("");
      setBody("");
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to save assignment.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAssignment(block: ContentBlock) {
    const ok = await askConfirm({
      title: "Delete assignment?",
      description: `Delete assignment “${block.title || "Assignment"}”?`,
      confirmLabel: "Delete assignment",
    });
    if (!ok) return;
    try {
      await apiFetch(`/admin/blocks/${block.id}`, { method: "DELETE" });
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete assignment.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-caisbe-muted">Optional chapter assignments.</p>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green"
        >
          {open ? "Cancel" : "+ Add assignment"}
        </button>
      </div>

      {assignments.length === 0 && !open ? (
        <p className="text-sm text-caisbe-muted">No assignments yet.</p>
      ) : (
        <ul className="space-y-2">
          {assignments.map((block) => (
            <AssignmentListItem
              key={block.id}
              block={block}
              onDelete={() => void deleteAssignment(block)}
            />
          ))}
        </ul>
      )}

      {open ? (
        <form onSubmit={saveAssignment} className="space-y-3 border border-ifma-border p-4">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Assignment title"
            className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
          />
          <textarea
            required
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={4}
            placeholder="Assignment prompt"
            className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm outline-none focus:border-caisbe-green"
          />
          <button
            type="submit"
            disabled={saving}
            className="border-2 border-caisbe-green bg-caisbe-green px-4 py-2 text-sm font-semibold uppercase text-white disabled:opacity-60"
          >
            {saving ? "Adding…" : "Add assignment"}
          </button>
        </form>
      ) : null}
    </div>
  );
}

function AssignmentListItem({
  block,
  onDelete,
}: {
  block: ContentBlock;
  onDelete: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <li className="border border-ifma-border-light">
      <div className="flex items-center gap-1 px-2 py-2">
        <CollapseToggle
          expanded={expanded}
          onToggle={() => setExpanded((v) => !v)}
          label={block.title || "assignment"}
        />
        <p className="min-w-0 flex-1 truncate font-semibold text-caisbe-text">{block.title}</p>
        <DeleteIconButton
          label={`Delete assignment ${block.title || ""}`.trim()}
          onClick={onDelete}
        />
      </div>
      {expanded ? (
        <div className="border-t border-ifma-border-light px-4 py-3">
          {block.body ? (
            <p className="whitespace-pre-wrap text-sm text-caisbe-muted">{block.body}</p>
          ) : (
            <p className="text-xs text-caisbe-muted">No assignment prompt.</p>
          )}
        </div>
      ) : null}
    </li>
  );
}
