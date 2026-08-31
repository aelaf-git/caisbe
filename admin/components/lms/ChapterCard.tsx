"use client";

import { useRef, useState, type FormEvent } from "react";
import AssignmentFilePreview, { ASSIGNMENT_ACCEPT, isAssignmentFile } from "@/components/lms/AssignmentFilePreview";
import QuizBlockEditor from "@/components/lms/QuizBlockEditor";
import TopicContentEditor from "@/components/lms/TopicContentEditor";
import ChapterUploads from "@/components/lms/ChapterUploads";
import { CollapseToggle } from "@/components/ui/CollapseToggle";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import { useConfirmDialog } from "@/components/ui/useConfirmDialog";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, apiUpload, ApiError } from "@/lib/auth";
import { numberedTitle } from "@/lib/ordinalTitles";
import type { Chapter, ContentBlock } from "@/lib/lms";

type Tab = "content" | "quizzes" | "assignments";

type AskConfirm = (options: {
  title: string;
  description: string;
  confirmLabel?: string;
}) => Promise<boolean>;

type ChapterCardProps = {
  chapter: Chapter;
  sequence: number;
  defaultExpanded?: boolean;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
};

export default function ChapterCard({
  chapter,
  sequence,
  defaultExpanded = false,
  onChanged,
  onError,
}: ChapterCardProps) {
  const { confirm, dialog } = useConfirmDialog();
  const [expanded, setExpanded] = useState(defaultExpanded);
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Title
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
                ["content", "Content"],
                ["quizzes", "Quizzes"],
                ["assignments", "Assignments"],
              ] as const
            ).map(([key, label]) => (
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
              </button>
            ))}
          </div>

          <div className="border-t border-ifma-border-light p-4">
            {tab === "content" ? (
              <ContentPanel
                chapter={chapter}
                sequence={sequence}
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
  sequence,
  onAddTopic,
  onChanged,
  onError,
  askConfirm,
  busy,
}: {
  chapter: Chapter;
  sequence: number;
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
          Add topics, then nest notes and subtopics as deep as you need. Files for the whole chapter
          go in Chapter uploads below.
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
          {chapter.lessons.map((topic, topicIndex) => (
            <TopicContentEditor
              key={topic.id}
              topic={topic}
              chapterSequence={sequence}
              topicIndex={topicIndex}
              onChanged={onChanged}
              onError={onError}
              askConfirm={askConfirm}
            />
          ))}
        </div>
      )}

      <ChapterUploads
        chapter={chapter}
        onChanged={onChanged}
        onError={onError}
        askConfirm={askConfirm}
      />
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
  const [adding, setAdding] = useState(false);
  const [newQuizId, setNewQuizId] = useState<number | null>(null);

  async function addQuiz() {
    setAdding(true);
    try {
      const created = await apiFetch<ContentBlock>(`/admin/chapters/${chapter.id}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: "quiz",
          title: "Quiz",
          quiz_title: "Quiz",
          quiz_questions: [
            {
              prompt: "Enter your question here",
              sort_order: 0,
              choices: [
                { text: "Correct answer — edit this option", is_correct: true, sort_order: 0 },
                { text: "Another option — edit this", is_correct: false, sort_order: 1 },
              ],
            },
          ],
          sort_order: (chapter.blocks ?? []).length,
        }),
      });
      setNewQuizId(created.id);
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to add quiz.");
    } finally {
      setAdding(false);
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
      if (newQuizId === block.id) setNewQuizId(null);
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to delete quiz.");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-caisbe-muted">
          Optional chapter quizzes for learners. Each quiz saves only when every question is complete
          and one correct answer is marked.
        </p>
        <button
          type="button"
          disabled={adding}
          onClick={() => void addQuiz()}
          className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green disabled:opacity-60"
        >
          {adding ? "Adding…" : "+ Add quiz"}
        </button>
      </div>

      {quizzes.length === 0 ? (
        <p className="text-sm text-caisbe-muted">No quizzes yet.</p>
      ) : (
        <ul className="space-y-2">
          {quizzes.map((block) => (
            <QuizBlockEditor
              key={block.id}
              block={block}
              radioNamePrefix={`chapter-${chapter.id}-quiz-${block.id}`}
              defaultExpanded={block.id === newQuizId}
              onDelete={() => void deleteQuiz(block)}
              onError={onError}
            />
          ))}
        </ul>
      )}
    </div>
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  async function saveAssignment(event: FormEvent) {
    event.preventDefault();
    if (!file) {
      onError("Choose a PDF or Word file to attach.");
      return;
    }
    if (!isAssignmentFile(file)) {
      onError("Assignments must be a PDF or Word (.doc, .docx) file.");
      return;
    }
    setSaving(true);
    try {
      const uploaded = await apiUpload("/admin/uploads", file);
      await apiFetch(`/admin/chapters/${chapter.id}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: "assignment",
          title: title.trim() || file.name.replace(/\.[^.]+$/, ""),
          label: file.name,
          url: uploaded.url,
          sort_order: (chapter.blocks ?? []).length,
        }),
      });
      setOpen(false);
      setTitle("");
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await onChanged();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to add assignment.");
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
        <p className="text-sm text-caisbe-muted">
          Attach PDF or Word assignment files for this chapter.
        </p>
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
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-caisbe-text">Title (optional)</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the file name"
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-caisbe-text">File</span>
            <input
              ref={fileInputRef}
              type="file"
              required
              accept={ASSIGNMENT_ACCEPT}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-caisbe-muted file:mr-3 file:rounded-md file:border-0 file:bg-caisbe-green/10 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-caisbe-green"
            />
            <p className="mt-1.5 text-xs text-caisbe-muted">PDF or Word (.doc, .docx) only. Max 500 MB.</p>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="border-2 border-caisbe-green bg-caisbe-green px-4 py-2 text-sm font-semibold uppercase text-white disabled:opacity-60"
          >
            {saving ? "Uploading…" : "Add assignment"}
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
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-caisbe-text">{block.title || "Assignment"}</p>
          {block.label ? (
            <p className="truncate text-xs text-caisbe-muted">{block.label}</p>
          ) : null}
        </div>
        <DeleteIconButton
          label={`Delete assignment ${block.title || ""}`.trim()}
          onClick={onDelete}
        />
      </div>
      {expanded ? (
        <div className="border-t border-ifma-border-light px-4 py-3">
          <AssignmentFilePreview block={block} />
        </div>
      ) : null}
    </li>
  );
}
