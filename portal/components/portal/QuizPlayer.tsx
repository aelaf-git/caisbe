"use client";

import { useState } from "react";
import type { QuizAttempt, QuizQuestion } from "@/lib/lms";
import { ApiError } from "@/lib/auth";

type QuizPlayerProps = {
  title: string;
  questions: QuizQuestion[];
  onSubmit: (answers: Record<string, number>) => Promise<QuizAttempt>;
};

export default function QuizPlayer({ title, questions, onSubmit }: QuizPlayerProps) {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<QuizAttempt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await onSubmit(answers);
      setResult(res);
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
      {questions.map((question, index) => (
        <fieldset key={question.id ?? question.prompt} className="space-y-2">
          <legend className="text-sm font-medium text-caisbe-text">
            {index + 1}. {question.prompt}
          </legend>
          <div className="space-y-2">
            {question.choices.map((choice) => {
              const selected = answers[String(question.id)] === choice.id;
              return (
                <label
                  key={choice.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm ${
                    selected
                      ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-text-dark"
                      : "border-ifma-border bg-white text-caisbe-text hover:border-caisbe-red/40"
                  }`}
                >
                  <input
                    type="radio"
                    className="mt-0.5"
                    name={`q-${question.id}`}
                    checked={selected}
                    onChange={() => {
                      if (choice.id == null) return;
                      setAnswers((prev) => ({ ...prev, [String(question.id)]: choice.id! }));
                    }}
                  />
                  <span>{choice.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {result ? (
        <p className={`text-sm font-medium ${result.passed ? "text-caisbe-green" : "text-caisbe-red"}`}>
          Score: {result.score}% — {result.passed ? "Passed" : "Not passed"}
          {result.certificate_code ? ` · Certificate ${result.certificate_code}` : null}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting || questions.length === 0}
        onClick={() => void handleSubmit()}
        className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
