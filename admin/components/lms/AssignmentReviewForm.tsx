"use client";

import { useState } from "react";
import Button from "@/components/ui/Button";

export type AssignmentReviewPayload = {
  status: "passed" | "failed";
  score: number | null;
  feedback: string | null;
};

export default function AssignmentReviewForm({
  pointsPossible,
  initialScore,
  initialFeedback,
  busy,
  onReview,
}: {
  pointsPossible: number | null;
  initialScore: number | null;
  initialFeedback: string | null;
  busy: boolean;
  onReview: (payload: AssignmentReviewPayload) => void;
}) {
  const [score, setScore] = useState(initialScore == null ? "" : String(initialScore));
  const [feedback, setFeedback] = useState(initialFeedback ?? "");
  const numeric = score.trim() === "" ? null : Number(score);
  const scoreOk =
    pointsPossible == null
      ? true
      : numeric != null && Number.isInteger(numeric) && numeric >= 0 && numeric <= pointsPossible;
  const suggested =
    pointsPossible != null && scoreOk && numeric != null
      ? numeric >= pointsPossible * 0.7
        ? "Pass"
        : "Fail"
      : null;

  function payload(status: "passed" | "failed"): AssignmentReviewPayload {
    return {
      status,
      score: pointsPossible == null ? null : numeric,
      feedback: feedback.trim() || null,
    };
  }

  return (
    <div className="space-y-3">
      {pointsPossible != null ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-caisbe-text">Score (out of {pointsPossible})</span>
          <input
            type="number"
            min={0}
            max={pointsPossible}
            step={1}
            value={score}
            onChange={(event) => setScore(event.target.value)}
            className="h-11 w-32 rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
          />
        </label>
      ) : null}
      {suggested ? <p className="text-xs text-caisbe-muted">Suggested result at 70%: {suggested}</p> : null}
      <label className="block text-sm">
        <span className="mb-1.5 block font-medium text-caisbe-text">Feedback</span>
        <textarea
          value={feedback}
          onChange={(event) => setFeedback(event.target.value)}
          rows={3}
          placeholder="Optional note for the student"
          className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm outline-none focus:border-caisbe-green"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={busy || !scoreOk} onClick={() => onReview(payload("passed"))}>
          Pass
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={busy || !scoreOk}
          onClick={() => onReview(payload("failed"))}
        >
          Fail
        </Button>
      </div>
    </div>
  );
}
