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
    <div className="space-y-4 border border-ifma-border p-4">
      <h3 className="text-lg font-semibold text-caisbe-text">{title}</h3>
      {questions.map((question) => (
        <fieldset key={question.id ?? question.prompt} className="space-y-2">
          <legend className="text-sm font-medium text-caisbe-text">{question.prompt}</legend>
          {question.choices.map((choice) => (
            <label key={choice.id} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name={`q-${question.id}`}
                checked={answers[String(question.id)] === choice.id}
                onChange={() => {
                  if (choice.id == null) return;
                  setAnswers((prev) => ({ ...prev, [String(question.id)]: choice.id! }));
                }}
              />
              {choice.text}
            </label>
          ))}
        </fieldset>
      ))}

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {result ? (
        <p className={`text-sm ${result.passed ? "text-caisbe-green" : "text-caisbe-red"}`}>
          Score: {result.score}% — {result.passed ? "Passed" : "Not passed"}
          {result.certificate_code ? ` · Certificate ${result.certificate_code}` : null}
        </p>
      ) : null}

      <button
        type="button"
        disabled={submitting || questions.length === 0}
        onClick={() => void handleSubmit()}
        className="border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase text-white disabled:opacity-60"
      >
        {submitting ? "Submitting…" : "Submit"}
      </button>
    </div>
  );
}
