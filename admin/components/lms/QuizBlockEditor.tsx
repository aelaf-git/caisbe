"use client";

import { useEffect, useMemo, useState } from "react";
import QuizQuestionEditor, {
  emptyQuestion,
  validateQuestions,
} from "@/components/lms/QuizQuestionEditor";
import { DeleteIconButton } from "@/components/ui/IconTrash";
import { CollapseToggle } from "@/components/ui/CollapseToggle";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ContentBlock, QuizQuestion } from "@/lib/lms";

export type QuizDraft = {
  title: string;
  questions: QuizQuestion[];
};

function questionsFromBlock(block: ContentBlock): QuizQuestion[] {
  if (!block.quiz?.questions?.length) {
    return [emptyQuestion()];
  }
  return block.quiz.questions.map((q) => ({
    prompt: q.prompt,
    sort_order: q.sort_order,
    choices: q.choices.map((c) => ({
      text: c.text,
      is_correct: Boolean(c.is_correct),
      sort_order: c.sort_order,
    })),
  }));
}

export function quizDraftFromBlock(block: ContentBlock): QuizDraft {
  return {
    title: block.title || block.quiz?.title || "Quiz",
    questions: questionsFromBlock(block),
  };
}

function serializeQuestions(questions: QuizQuestion[]) {
  return questions.map((q, qi) => ({
    prompt: q.prompt,
    sort_order: qi,
    choices: q.choices.map((c, ci) => ({
      text: c.text,
      is_correct: Boolean(c.is_correct),
      sort_order: ci,
    })),
  }));
}

type QuizBlockEditorProps = {
  block: ContentBlock;
  radioNamePrefix: string;
  defaultExpanded?: boolean;
  onDelete: () => void;
  onError: (message: string) => void;
};

export default function QuizBlockEditor({
  block,
  radioNamePrefix,
  defaultExpanded = false,
  onDelete,
  onError,
}: QuizBlockEditorProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [draft, setDraft] = useState<QuizDraft>(() => quizDraftFromBlock(block));

  const baselineKey = useMemo(
    () =>
      `${block.id}:${block.title ?? ""}:${block.quiz?.title ?? ""}:${block.quiz?.questions?.length ?? 0}`,
    [block],
  );

  useEffect(() => {
    setDraft(quizDraftFromBlock(block));
  }, [baselineKey, block]);

  const validationError = useMemo(() => validateQuestions(draft.questions), [draft.questions]);

  const autosave = useAutosave({
    id: `quiz-block-${block.id}`,
    value: draft,
    baselineKey,
    enabled: draft.title.trim().length >= 1,
    save: async (next) => {
      const invalid = validateQuestions(next.questions);
      if (invalid) {
        throw new Error(invalid);
      }
      try {
        await apiFetch(`/admin/blocks/${block.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            title: next.title.trim(),
            quiz_title: next.title.trim(),
            quiz_questions: serializeQuestions(next.questions),
          }),
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : "Unable to save quiz.";
        onError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
  });

  const questionCount = draft.questions.length;
  const displayError = autosave.error || validationError;

  return (
    <li className="border border-ifma-border-light">
      <div className="flex flex-wrap items-center gap-1 px-2 py-2">
        <CollapseToggle
          expanded={expanded}
          onToggle={() => {
            if (expanded) void autosave.flush();
            setExpanded((v) => !v);
          }}
          label={draft.title || "quiz"}
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-caisbe-text">{draft.title || "Quiz"}</p>
          <p className="text-xs text-caisbe-muted">
            {questionCount} question{questionCount === 1 ? "" : "s"}
            {autosave.status === "saving"
              ? " · Saving…"
              : autosave.status === "saved"
                ? " · Saved"
                : autosave.status === "pending"
                  ? " · Unsaved changes…"
                  : validationError
                    ? " · Fix errors to save"
                    : ""}
          </p>
        </div>
        <DeleteIconButton label={`Delete quiz ${draft.title}`} onClick={onDelete} />
      </div>

      {expanded ? (
        <div className="space-y-3 border-t border-ifma-border-light p-4">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-caisbe-text">Quiz title</span>
            <input
              value={draft.title}
              onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
              onBlur={() => void autosave.flush()}
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
            />
          </label>
          <QuizQuestionEditor
            questions={draft.questions}
            onChange={(questions) => setDraft((prev) => ({ ...prev, questions }))}
            radioNamePrefix={radioNamePrefix}
            error={displayError}
          />
        </div>
      ) : null}
    </li>
  );
}
