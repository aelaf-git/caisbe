"use client";

import { useEffect, useRef, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import type { ExamOrder, ExamSessionState, FinalExam, QuizAttempt, QuizQuestion } from "@/lib/lms";

type Phase =
  | { kind: "loading" }
  | { kind: "intro" }
  | { kind: "live"; startedAt: string; deadlineMs: number | null; order: ExamOrder | null }
  | { kind: "result"; score: number; passed: boolean; certificateCode: string | null };

function orderedQuestions(exam: FinalExam, order: ExamOrder | null): QuizQuestion[] {
  if (!order) return exam.questions;
  const questionsById = new Map(exam.questions.map((question) => [Number(question.id), question]));
  const ordered = order.questions
    .map((id) => questionsById.get(id))
    .filter((question): question is QuizQuestion => question != null);
  const seen = new Set(ordered.map((question) => Number(question.id)));
  for (const question of exam.questions) {
    if (!seen.has(Number(question.id))) ordered.push(question);
  }
  return ordered.map((question) => {
    const choiceIds = order.choices[String(question.id)];
    if (!choiceIds) return question;
    const choicesById = new Map(question.choices.map((choice) => [Number(choice.id), choice]));
    const choices = choiceIds
      .map((id) => choicesById.get(id))
      .filter((choice): choice is QuizQuestion["choices"][number] => choice != null);
    const seenChoices = new Set(choices.map((choice) => Number(choice.id)));
    for (const choice of question.choices) {
      if (!seenChoices.has(Number(choice.id))) choices.push(choice);
    }
    return { ...question, choices };
  });
}

function answerKey(examId: number, startedAt: string) {
  return `caisbe-exam-${examId}-${startedAt}`;
}

function readStoredAnswers(examId: number, startedAt: string): Record<string, number> {
  const stored = sessionStorage.getItem(answerKey(examId, startedAt));
  if (!stored) return {};
  try {
    const parsed = JSON.parse(stored) as Record<string, number>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function formatClock(totalSeconds: number) {
  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatLimit(minutes: number) {
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourLabel = `${hours} hour${hours === 1 ? "" : "s"}`;
  if (!rest) return hourLabel;
  return `${hourLabel} ${rest} minute${rest === 1 ? "" : "s"}`;
}

export default function ExamPlayer({
  courseId,
  exam,
  onFinished,
}: {
  courseId: number;
  exam: FinalExam;
  onFinished: () => Promise<void>;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const answersRef = useRef(answers);
  const phaseRef = useRef(phase);
  const submitLock = useRef(false);
  const autoSubmitted = useRef(false);
  answersRef.current = answers;
  phaseRef.current = phase;

  function enterLive(startedAt: string, remainingSeconds: number | null, order: ExamOrder | null) {
    autoSubmitted.current = false;
    submitLock.current = false;
    setAnswers(readStoredAnswers(exam.id, startedAt));
    setPhase({
      kind: "live",
      startedAt,
      deadlineMs: remainingSeconds == null ? null : Date.now() + remainingSeconds * 1000,
      order,
    });
  }

  function applySession(state: ExamSessionState, certificateCode: string | null) {
    if (state.in_progress && state.started_at) {
      enterLive(state.started_at, state.remaining_seconds, state.order);
      return;
    }
    if (state.latest_score != null) {
      setPhase({
        kind: "result",
        score: state.latest_score,
        passed: Boolean(state.latest_passed),
        certificateCode,
      });
      return;
    }
    setPhase({ kind: "intro" });
  }

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const state = await apiFetch<ExamSessionState>(`/me/courses/${courseId}/final-exam/session`);
        if (cancelled) return;
        applySession(state, null);
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.detail : "Unable to open the exam.");
        setPhase({ kind: "intro" });
      }
    }
    void loadSession();
    return () => {
      cancelled = true;
    };
    // Session is loaded once per exam. Retakes call start explicitly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, exam.id]);

  useEffect(() => {
    if (phase.kind !== "live") return;
    sessionStorage.setItem(answerKey(exam.id, phase.startedAt), JSON.stringify(answers));
  }, [answers, exam.id, phase]);

  useEffect(() => {
    if (phase.kind !== "live" || phase.deadlineMs == null) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [phase]);

  async function begin() {
    setError(null);
    setSubmitting(true);
    try {
      const state = await apiFetch<ExamSessionState>(`/me/courses/${courseId}/final-exam/start`, {
        method: "POST",
      });
      applySession(state, null);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to start the exam.");
    } finally {
      setSubmitting(false);
    }
  }

  async function submit(force: boolean) {
    const current = phaseRef.current;
    if (submitLock.current || current.kind !== "live") return;
    const selected = answersRef.current;
    const unanswered = exam.questions.some((question) => selected[String(question.id)] == null);
    if (unanswered && !force) {
      setError("Answer every question before submitting.");
      return;
    }
    submitLock.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const result = await apiFetch<QuizAttempt>(`/me/courses/${courseId}/final-exam/submit`, {
        method: "POST",
        body: JSON.stringify({ answers: selected }),
      });
      sessionStorage.removeItem(answerKey(exam.id, current.startedAt));
      setAnswers({});
      setPhase({
        kind: "result",
        score: result.score,
        passed: result.passed,
        certificateCode: result.certificate_code,
      });
      await onFinished();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to submit.");
      submitLock.current = false;
    } finally {
      setSubmitting(false);
    }
  }

  const remaining =
    phase.kind === "live" && phase.deadlineMs != null
      ? Math.max(0, Math.ceil((phase.deadlineMs - nowMs) / 1000))
      : null;

  useEffect(() => {
    if (phase.kind !== "live" || remaining == null || remaining > 0 || autoSubmitted.current) return;
    autoSubmitted.current = true;
    void submit(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remaining, phase.kind]);

  const liveQuestions = phase.kind === "live" ? orderedQuestions(exam, phase.order) : exam.questions;
  const answeredCount = exam.questions.filter((question) => answers[String(question.id)] != null).length;
  const limitLabel = exam.time_limit_minutes != null ? formatLimit(exam.time_limit_minutes) : null;
  const timeUp = remaining === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Final exam</p>
          <h2 className="mt-1 font-display text-2xl font-semibold text-caisbe-text-dark">{exam.title}</h2>
          <p className="mt-1 text-sm text-caisbe-muted">Pass mark: {exam.pass_percent}%</p>
        </div>
        {phase.kind === "live" ? (
          <span
            className={`inline-flex items-center rounded-md border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
              remaining != null && remaining <= 60
                ? "border-caisbe-red/40 bg-caisbe-red/10 text-caisbe-red"
                : "border-ifma-border bg-admin-canvas text-caisbe-muted"
            }`}
          >
            {remaining != null
              ? `${formatClock(remaining)} · ${answeredCount} of ${exam.questions.length}`
              : `${answeredCount} of ${exam.questions.length} answered`}
          </span>
        ) : null}
      </div>

      {phase.kind === "loading" ? <p className="text-sm text-caisbe-muted">Loading exam…</p> : null}

      {phase.kind === "intro" ? (
        <div className="space-y-4 rounded-md border border-ifma-border bg-[#fafaf8] px-4 py-4">
          <p className="text-sm leading-6 text-caisbe-text">
            {limitLabel
              ? `You have ${limitLabel}. The timer starts when you begin, and the exam is submitted when time runs out.`
              : "This exam is not timed."}{" "}
            Score at least {exam.pass_percent}% to pass. A lower score can be taken again. Correct answers are not shown.
          </p>
          <button
            type="button"
            disabled={submitting || exam.questions.length === 0}
            onClick={() => void begin()}
            className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {submitting ? "Starting…" : "Start exam"}
          </button>
        </div>
      ) : null}

      {phase.kind === "live" ? (
        <div className="space-y-5">
          {liveQuestions.map((question, index) => (
            <fieldset key={question.id ?? question.prompt} className="space-y-3" disabled={submitting}>
              <legend className="text-sm font-semibold text-caisbe-text-dark">
                <span className="mr-2 text-caisbe-muted">{index + 1}.</span>
                {question.prompt}
              </legend>
              <div className="space-y-2">
                {question.choices.map((choice, choiceIndex) => {
                  const selected = Number(answers[String(question.id)]) === Number(choice.id);
                  const letter = String.fromCharCode(65 + choiceIndex);
                  return (
                    <label
                      key={choice.id}
                      className={`flex cursor-pointer items-start gap-3 rounded-md border px-3 py-3 text-sm ${
                        selected
                          ? "border-caisbe-red bg-caisbe-red/5 text-caisbe-text-dark"
                          : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red/40"
                      }`}
                    >
                      <input
                        type="radio"
                        className="mt-1"
                        name={`exam-q-${question.id}`}
                        checked={selected}
                        onChange={() => {
                          if (choice.id == null) return;
                          setAnswers((prev) => ({ ...prev, [String(question.id)]: choice.id! }));
                        }}
                      />
                      <span
                        className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-semibold ${
                          selected ? "bg-caisbe-red/15 text-caisbe-red" : "bg-admin-canvas text-caisbe-muted"
                        }`}
                      >
                        {letter}
                      </span>
                      <span className="min-w-0 flex-1 leading-snug">{choice.text}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}
          <button
            type="button"
            disabled={submitting || exam.questions.length === 0}
            onClick={() => void submit(timeUp)}
            className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark disabled:opacity-60"
          >
            {submitting ? "Submitting…" : "Submit exam"}
          </button>
        </div>
      ) : null}

      {phase.kind === "result" ? (
        <div
          className={`space-y-4 rounded-md border px-5 py-5 ${
            phase.passed
              ? "border-admin-success/30 bg-admin-success-soft"
              : "border-ifma-border bg-[#fafaf8]"
          }`}
        >
          <p
            className={`text-xs font-semibold uppercase tracking-wide ${
              phase.passed ? "text-admin-success" : "text-caisbe-muted"
            }`}
          >
            {phase.passed ? "Passed" : "Score"}
          </p>
          <p className="font-display text-4xl font-semibold tabular-nums text-caisbe-text-dark">{phase.score}%</p>
          <p className="text-sm text-caisbe-text">
            {phase.passed
              ? `Pass mark ${exam.pass_percent}%`
              : `Pass mark ${exam.pass_percent}%. Take the exam again.`}
          </p>
          {phase.passed ? null : (
            <button
              type="button"
              disabled={submitting}
              onClick={() => void begin()}
              className="rounded-md border-2 border-caisbe-red bg-admin-surface px-6 py-2.5 text-sm font-semibold uppercase text-caisbe-red hover:bg-caisbe-red hover:text-white disabled:opacity-60"
            >
              {submitting ? "Starting…" : "Retake exam"}
            </button>
          )}
        </div>
      ) : null}

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}
