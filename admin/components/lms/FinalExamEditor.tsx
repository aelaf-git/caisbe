"use client";

import { useMemo } from "react";
import QuizQuestionEditor, { validateQuestions } from "@/components/lms/QuizQuestionEditor";
import PassMarkControl from "@/components/lms/PassMarkControl";
import FormField, { fieldClassName } from "@/components/ui/FormField";
import { useAutosave } from "@/hooks/useAutosave";
import { apiFetch, ApiError } from "@/lib/auth";
import type { QuizQuestion } from "@/lib/lms";

export type ExamDraft = {
  title: string;
  pass_percent: number;
  time_limit_minutes: number | null;
  questions_to_appear: number | null;
  secure_mode: boolean;
  max_integrity_violations: number;
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
  const appearError = useMemo(() => {
    const appear = exam.questions_to_appear;
    if (appear == null) return null;
    if (appear < 1) return "Questions to appear must be at least 1.";
    if (appear > exam.questions.length) {
      return `Questions to appear (${appear}) cannot exceed the bank size (${exam.questions.length}).`;
    }
    return null;
  }, [exam.questions.length, exam.questions_to_appear]);

  const validationError = useMemo(() => {
    return validateQuestions(exam.questions) ?? appearError;
  }, [appearError, exam.questions]);

  const autosave = useAutosave({
    id: `course-${courseId}-exam`,
    value: exam,
    baselineKey,
    enabled: true,
    save: async (next) => {
      const invalid =
        validateQuestions(next.questions) ??
        (next.questions_to_appear != null && next.questions_to_appear > next.questions.length
          ? `Questions to appear (${next.questions_to_appear}) cannot exceed the bank size (${next.questions.length}).`
          : null);
      if (invalid) {
        throw new Error(invalid);
      }
      try {
        await apiFetch(`/admin/courses/${courseId}/final-exam`, {
          method: "PUT",
          body: JSON.stringify({
            title: next.title,
            pass_percent: next.pass_percent,
            time_limit_minutes: next.time_limit_minutes,
            questions_to_appear: next.questions_to_appear,
            secure_mode: next.secure_mode,
            max_integrity_violations: next.max_integrity_violations,
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
      {statusLabel ? (
        <p className="inline-flex items-center gap-1.5 text-xs font-medium text-caisbe-muted">
          <span className="h-2 w-2 animate-pulse rounded-full bg-admin-warning" />
          {statusLabel}
        </p>
      ) : null}
      <FormField label="Exam title">
        <input
          value={exam.title}
          onChange={(e) => onChange({ ...exam, title: e.target.value })}
          onBlur={() => void autosave.flush()}
          className={fieldClassName}
        />
      </FormField>
      <PassMarkControl
        value={exam.pass_percent}
        onChange={(pass_percent) => onChange({ ...exam, pass_percent })}
        onCommit={() => void autosave.flush()}
        description="Minimum score required to pass the final exam. A lower score can be retaken."
        ariaLabel="Exam pass percent"
      />
      <FormField
        label="Time limit (minutes)"
        hint="Optional. Leave blank if this exam is not timed. The timer starts when the student begins."
      >
        <input
          type="number"
          min={1}
          max={480}
          placeholder="No time limit"
          value={exam.time_limit_minutes ?? ""}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) {
              onChange({ ...exam, time_limit_minutes: null });
              return;
            }
            const next = Number(raw);
            if (!Number.isFinite(next)) return;
            onChange({
              ...exam,
              time_limit_minutes: Math.min(480, Math.max(1, Math.trunc(next))),
            });
          }}
          onBlur={() => void autosave.flush()}
          className={fieldClassName}
        />
      </FormField>
      <FormField
        label="Secure exam mode"
        hint="Requires fullscreen, camera presence check, blocks copy/paste, and logs tab switches. After too many integrity flags the attempt is failed."
      >
        <label className="mt-1 flex items-center gap-2 text-sm text-caisbe-text">
          <input
            type="checkbox"
            checked={exam.secure_mode}
            onChange={(e) => onChange({ ...exam, secure_mode: e.target.checked })}
            onBlur={() => void autosave.flush()}
          />
          Enable secure exam lockdown for this final exam
        </label>
      </FormField>
      {exam.secure_mode ? (
        <FormField
          label="Max integrity violations"
          hint="Leaving fullscreen/tab or copy/paste attempts count as violations. At this limit the attempt is locked and scored as failed."
        >
          <input
            type="number"
            min={1}
            max={20}
            value={exam.max_integrity_violations}
            onChange={(event) => {
              const next = Number(event.target.value);
              if (!Number.isFinite(next)) return;
              onChange({
                ...exam,
                max_integrity_violations: Math.min(20, Math.max(1, Math.trunc(next))),
              });
            }}
            onBlur={() => void autosave.flush()}
            className={fieldClassName}
          />
        </FormField>
      ) : null}
      <FormField
        label="Questions to appear"
        hint="How many questions each student sees per attempt. Leave blank to show the full bank. Each attempt draws a random subset with shuffled question and choice order."
      >
        <input
          type="number"
          min={1}
          max={Math.max(1, exam.questions.length)}
          placeholder="All questions"
          value={exam.questions_to_appear ?? ""}
          onChange={(event) => {
            const raw = event.target.value.trim();
            if (!raw) {
              onChange({ ...exam, questions_to_appear: null });
              return;
            }
            const next = Number(raw);
            if (!Number.isFinite(next)) return;
            onChange({
              ...exam,
              questions_to_appear: Math.max(1, Math.trunc(next)),
            });
          }}
          onBlur={() => void autosave.flush()}
          className={fieldClassName}
        />
      </FormField>
      <p className="text-sm text-caisbe-muted">
        Bank: <span className="font-semibold text-caisbe-text">{exam.questions.length}</span>
        {" · "}
        Appearing:{" "}
        <span className="font-semibold text-caisbe-text">
          {exam.questions_to_appear ?? exam.questions.length}
        </span>
        {exam.questions_to_appear != null && exam.questions_to_appear < exam.questions.length
          ? " (random subset each attempt)"
          : null}
      </p>
      <QuizQuestionEditor
        questions={exam.questions}
        onChange={(questions) => onChange({ ...exam, questions })}
        radioNamePrefix="exam"
        error={displayError}
      />
    </>
  );
}
