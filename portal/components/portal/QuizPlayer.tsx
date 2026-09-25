"use client";

import { useState } from "react";
import type { QuizAttempt, QuizQuestion } from "@/lib/lms";
import { ApiError } from "@/lib/auth";

type QuizPlayerProps = {
  title: string;
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, number>) => Promise<QuizAttempt>;
  onResult?: (result: QuizAttempt | null) => void;
  passedNote?: string;
};

export default function QuizPlayer({ title, questions, onSubmit, onResult, passedNote }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const reviews = result?.reviews ?? [];
  const revealed = reviews.length > 0;

  function applyResult(next: QuizAttempt | null) {
    setResult(next);
    onResult?.(next);
  }

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

  return (
    <div className="space-y-5 rounded-md border border-ifma-border bg-[#fafaf8] p-5 md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Quiz</p>
        <h3 className="mt-1 font-display text-xl font-semibold text-caisbe-text-dark">{title}</h3>
      </div>
      {questions.map((question, index) => {
        const review = reviews.find((item) => Number(item.question_id) === Number(question.id));
        return (
          <fieldset key={question.id ?? question.prompt} className="space-y-2" disabled={revealed}>
            <legend className="text-sm font-medium text-caisbe-text">
              {index + 1}. {question.prompt}
            </legend>
            <div className="space-y-2">
              {question.choices.map((choice) => {
                const selected = Number(answers[String(question.id)]) === Number(choice.id);
                const isCorrect = revealed && Number(review?.correct_choice_id) === Number(choice.id);
                const isWrong = revealed && selected && !isCorrect;
                return (
                  <label
                    key={choice.id}
                    className={`flex items-start gap-3 rounded-md border-2 px-3 py-2.5 text-sm ${
                      isCorrect
                        ? "border-admin-success bg-admin-success-soft text-caisbe-text-dark"
                        : isWrong
                          ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-text-dark"
                          : selected
                            ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-text-dark"
                            : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red/40"
                    } ${revealed ? "cursor-default" : "cursor-pointer"}`}
                  >
                    <input
                      type="radio"
                      className="mt-0.5"
                      name={`q-${question.id}`}
                      checked={selected}
                      onChange={() => {
                        if (choice.id == null || revealed) return;
                        setAnswers((prev) => ({ ...prev, [String(question.id)]: choice.id! }));
                      }}
                    />
                    <span className="min-w-0">
                      {choice.text}
                      {isCorrect ? <span className="ml-2 text-xs font-semibold uppercase text-admin-success">Correct</span> : null}
                      {isWrong ? <span className="ml-2 text-xs font-semibold uppercase text-caisbe-red">Your answer</span> : null}
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        );
      })}

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {result ? (
        <p className={`text-sm font-medium ${result.passed ? "text-admin-success" : "text-caisbe-red"}`}>
          Score: {result.score}%.{passedNote ? ` ${passedNote}` : " You can continue."}
          {result.certificate_code ? ` · Certificate ${result.certificate_code}` : null}
        </p>
      ) : null}

      {revealed ? null : (
        <button
          type="button"
          disabled={submitting || questions.length === 0}
          onClick={() => void handleSubmit()}
          className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {submitting ? "Submitting…" : "Submit"}
        </button>
      )}
    </div>
  );
}
