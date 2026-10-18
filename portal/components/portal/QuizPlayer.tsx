"use client";

import { useEffect, useState } from "react";
import type { QuizAttempt, QuizQuestion } from "@/lib/lms";
import { apiFetch, ApiError } from "@/lib/auth";

type QuizPlayerProps = {
  quizId: number;
  title: string;
  questions: QuizQuestion[];
  /** When true, load the latest attempt so scores/reviews survive navigation. */
  hydrateCompleted?: boolean;
  onSubmit: (answers: Record<string, number>) => Promise<QuizAttempt>;
  onResult?: (result: QuizAttempt | null) => void;
};

export default function QuizPlayer({
  quizId,
  title,
  questions,
  hydrateCompleted = false,
  onSubmit,
  onResult,
}: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrior, setLoadingPrior] = useState(hydrateCompleted);

  const reviews = result?.reviews ?? [];
  const revealed = reviews.length > 0;
  const canRetry = Boolean(result && !result.passed);

  function applyResult(next: QuizAttempt | null) {
    setResult(next);
    if (next?.reviews?.length) {
      const restored: Record<string, number> = {};
      for (const review of next.reviews) {
        if (review.selected_choice_id != null) {
          restored[String(review.question_id)] = review.selected_choice_id;
        }
      }
      setAnswers(restored);
    }
    onResult?.(next);
  }

  useEffect(() => {
    if (!hydrateCompleted) {
      setLoadingPrior(false);
      return;
    }
    let cancelled = false;
    async function loadPrior() {
      setLoadingPrior(true);
      try {
        const prior = await apiFetch<QuizAttempt>(`/me/quizzes/${quizId}/latest`);
        if (!cancelled) applyResult(prior);
      } catch {
        if (!cancelled) applyResult(null);
      } finally {
        if (!cancelled) setLoadingPrior(false);
      }
    }
    void loadPrior();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when quiz/completion changes
  }, [quizId, hydrateCompleted]);

  async function handleSubmit() {
    const unanswered = questions.some((question) => answers[String(question.id)] == null);
    if (unanswered) {
      setError("Answer every question before submitting.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      applyResult(await onSubmit(answers));
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to submit.");
    } finally {
      setSubmitting(false);
    }
  }

  const answeredCount = questions.filter((question) => answers[String(question.id)] != null).length;

  if (loadingPrior) {
    return <p className="text-sm text-caisbe-muted">Loading quiz…</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Quiz</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">{title}</h2>
        </div>
        <span className="inline-flex items-center rounded-md border border-ifma-border bg-admin-surface px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
          {revealed && !canRetry
            ? "Checked"
            : `${answeredCount} of ${questions.length} answered`}
        </span>
      </div>

      <div className="space-y-5">
        {questions.map((question, index) => {
          const review = reviews.find((item) => Number(item.question_id) === Number(question.id));
          return (
            <fieldset key={question.id ?? question.prompt} className="space-y-3" disabled={revealed && !canRetry}>
              <legend className="text-sm font-semibold text-caisbe-text-dark">
                <span className="mr-2 text-caisbe-muted">{index + 1}.</span>
                {question.prompt}
              </legend>
              <div className="space-y-2">
                {question.choices.map((choice, choiceIndex) => {
                  const selected = Number(answers[String(question.id)]) === Number(choice.id);
                  const isCorrect = revealed && Number(review?.correct_choice_id) === Number(choice.id);
                  const isWrong = revealed && selected && !isCorrect;
                  const letter = String.fromCharCode(65 + choiceIndex);
                  return (
                    <label
                      key={choice.id}
                      className={`flex items-start gap-3 rounded-md border px-3 py-3 text-sm ${
                        isCorrect
                          ? "border-admin-success bg-admin-success-soft text-caisbe-text-dark"
                          : isWrong
                            ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-text-dark"
                            : selected
                              ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-text-dark"
                              : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red/40"
                      } ${revealed && !canRetry ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        name={`q-${question.id}`}
                        checked={selected}
                        onChange={() => {
                          if (choice.id == null || (revealed && !canRetry)) return;
                          setAnswers((prev) => ({ ...prev, [String(question.id)]: choice.id! }));
                        }}
                      />
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                          isCorrect
                            ? "bg-admin-success text-white"
                            : isWrong
                              ? "bg-caisbe-red text-white"
                              : selected
                                ? "bg-caisbe-red/15 text-caisbe-red"
                                : "bg-admin-canvas text-caisbe-muted"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">
                        {choice.text}
                        {isCorrect ? (
                          <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-admin-success">
                            Correct
                          </span>
                        ) : null}
                        {isWrong ? (
                          <span className="mt-1 block text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                            Your answer
                          </span>
                        ) : null}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      {result ? (
        <div className="space-y-3">
          <div className="rounded-md border border-ifma-border bg-[#fafaf8] px-4 py-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Score</p>
            <p className="mt-1 font-display text-3xl font-semibold text-caisbe-text-dark">{result.score}%</p>
            <p
              className={`mt-2 text-sm font-semibold ${
                result.passed ? "text-admin-success" : "text-caisbe-red"
              }`}
            >
              {result.passed ? "Passed" : "Not passed — you can try again."}
            </p>
            {result.certificate_code ? (
              <p className="mt-2 text-sm text-caisbe-text">Certificate {result.certificate_code}</p>
            ) : null}
          </div>
          {canRetry ? (
            <button
              type="button"
              disabled={submitting || questions.length === 0}
              onClick={() => {
                setResult(null);
                setAnswers({});
                onResult?.(null);
              }}
              className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
            >
              Try again
            </button>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          disabled={submitting || questions.length === 0}
          onClick={() => void handleSubmit()}
          className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      )}
    </div>
  );
}
