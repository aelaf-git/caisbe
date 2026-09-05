"use client";

import { useMemo } from "react";
import QuizQuestionEditor, { validateQuestions } from "@/components/lms/QuizQuestionEditor";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, ApiError } from "@/lib/auth";
import type { QuizQuestion } from "@/lib/lms";

export type ExamDraft = {
  title: string;
  pass_percent: number;
  questions: QuizQuestion[];
};

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

type FinalExamEditorProps = {
  courseId: number;
  baselineKey: number;
  exam: ExamDraft;
  onChange: (exam: ExamDraft) => void;
  onError: (message: string) => void;
};

export default function FinalExamEditor({
  courseId,
  baselineKey,
  exam,
  onChange,
  onError,
}: FinalExamEditorProps) {
  const validationError = useMemo(() => validateQuestions(exam.questions), [exam.questions]);

  const autosave = useAutosave({
    id: `course-${courseId}-exam`,
    value: exam,
    baselineKey,
    enabled: true,
    save: async (next) => {
      const invalid = validateQuestions(next.questions);
      if (invalid) {
        throw new Error(invalid);
      }
      try {
        await apiFetch(`/admin/courses/${courseId}/final-exam`, {
          method: "PUT",
          body: JSON.stringify({
            title: next.title,
            pass_percent: next.pass_percent,
            questions: serializeQuestions(next.questions),
          }),
        });
      } catch (err) {
        const message = err instanceof ApiError ? err.detail : "Unable to save final exam.";
        onError(message);
        throw err instanceof Error ? err : new Error(message);
      }
    },
  });

  const statusLabel = useMemo(() => {
    if (autosave.status === "saving") return "Saving exam…";
    if (autosave.status === "pending") return "Unsaved exam changes…";
    if (validationError && autosave.status === "error") return "Fix exam errors to save";
    return null;
  }, [autosave.status, validationError]);

  const displayError = autosave.error || validationError;

  return (
    <>
      {statusLabel ? <p className="text-xs text-caisbe-muted">{statusLabel}</p> : null}
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-caisbe-text">Exam title</span>
        <input
          value={exam.title}
          onChange={(e) => onChange({ ...exam, title: e.target.value })}
          onBlur={() => void autosave.flush()}
          className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
        />
      </label>
      <div className="rounded-md border border-ifma-border-light bg-[#fafaf8] p-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-caisbe-text">Pass mark</p>
            <p className="mt-1 text-xs text-caisbe-muted">
              Minimum score required to pass the final exam.
            </p>
          </div>
          <div className="flex items-baseline gap-1 text-caisbe-green">
            <span className="font-display text-3xl font-semibold tabular-nums leading-none">
              {exam.pass_percent}
            </span>
            <span className="text-sm font-semibold">%</span>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-4">
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={exam.pass_percent}
            onChange={(e) => onChange({ ...exam, pass_percent: Number(e.target.value) })}
            onMouseUp={() => void autosave.flush()}
            onTouchEnd={() => void autosave.flush()}
            className="h-2 min-w-[180px] flex-1 cursor-pointer appearance-none rounded-full bg-ifma-border accent-caisbe-green"
            aria-label="Exam pass percent"
          />
          <label className="relative block w-24 shrink-0">
            <span className="sr-only">Exam pass percent</span>
            <input
              type="number"
              min={0}
              max={100}
              value={exam.pass_percent}
              onChange={(e) => {
                const next = Number(e.target.value);
                onChange({
                  ...exam,
                  pass_percent: Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0,
                });
              }}
              onBlur={() => void autosave.flush()}
              className="h-11 w-full rounded-md border border-ifma-border bg-white pr-8 pl-3 text-sm tabular-nums outline-none focus:border-caisbe-green"
            />
            <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-caisbe-muted">
              %
            </span>
          </label>
        </div>
      </div>
      <QuizQuestionEditor
        questions={exam.questions}
        onChange={(questions) => onChange({ ...exam, questions })}
        radioNamePrefix="exam"
        error={displayError}
      />
    </>
  );
}
