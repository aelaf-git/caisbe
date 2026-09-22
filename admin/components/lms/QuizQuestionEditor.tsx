"use client";

import { DeleteIconButton } from "@/components/ui/IconTrash";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import { fieldClassName } from "@/components/ui/FormField";
import type { QuizQuestion } from "@/lib/lms";

const MIN_CHOICES = 2;
const MAX_CHOICES = 8;

export function emptyChoice(sortOrder: number, isCorrect = false) {
  return { text: "", is_correct: isCorrect, sort_order: sortOrder };
}

export function emptyQuestion(): QuizQuestion {
  return {
    prompt: "",
    sort_order: 0,
    choices: [emptyChoice(0), emptyChoice(1)],
  };
}

export function validateQuestions(questions: QuizQuestion[]): string | null {
  if (questions.length === 0) {
    return "Add at least one question.";
  }
  for (let qi = 0; qi < questions.length; qi += 1) {
    const question = questions[qi];
    if (!question.prompt.trim()) {
      return `Question ${qi + 1} needs a prompt.`;
    }
    if (question.choices.length < MIN_CHOICES) {
      return `Question ${qi + 1} needs at least ${MIN_CHOICES} choices.`;
    }
    if (!question.choices.every((choice) => choice.text.trim())) {
      return `Question ${qi + 1}: fill in every choice.`;
    }
    const correctCount = question.choices.filter((choice) => choice.is_correct).length;
    if (correctCount !== 1) {
      return `Question ${qi + 1}: mark exactly one correct answer.`;
    }
  }
  return null;
}

type QuizQuestionEditorProps = {
  questions: QuizQuestion[];
  onChange: (questions: QuizQuestion[]) => void;
  radioNamePrefix: string;
  error?: string | null;
};

export default function QuizQuestionEditor({
  questions,
  onChange,
  radioNamePrefix,
  error,
}: QuizQuestionEditorProps) {
  function updateQuestion(index: number, next: QuizQuestion) {
    const copy = [...questions];
    copy[index] = next;
    onChange(copy);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-caisbe-muted">
        Select the radio button next to the correct answer for each question.
      </p>

      {questions.map((q, qi) => (
        <div key={qi} className="space-y-4 rounded-xl border border-ifma-border bg-admin-surface-muted/30 p-4 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-caisbe-red">
              Question {qi + 1}
            </p>
            {questions.length > 1 ? (
              <DeleteIconButton
                label={`Remove question ${qi + 1}`}
                onClick={() => onChange(questions.filter((_, idx) => idx !== qi))}
              />
            ) : null}
          </div>
          <input
            required
            placeholder="Question prompt"
            value={q.prompt}
            onChange={(e) => updateQuestion(qi, { ...q, prompt: e.target.value })}
            className={`${fieldClassName} font-medium`}
          />
          <div className="space-y-2">
          {q.choices.map((c, ci) => (
            <div key={ci} className={`flex items-center gap-2 rounded-lg border p-2 transition-colors ${c.is_correct ? "border-admin-success/30 bg-admin-success-soft" : "border-ifma-border bg-admin-surface"}`}>
              <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-xs font-medium text-caisbe-muted">
                <input
                  type="radio"
                  name={`${radioNamePrefix}-${qi}`}
                  required
                  checked={Boolean(c.is_correct)}
                  onChange={() =>
                    updateQuestion(qi, {
                      ...q,
                      choices: q.choices.map((choice, idx) => ({
                        ...choice,
                        is_correct: idx === ci,
                      })),
                    })
                  }
                />
                Correct
              </label>
              <input
                required
                placeholder={`Choice ${ci + 1}`}
                value={c.text}
                onChange={(e) => {
                  const choices = [...q.choices];
                  choices[ci] = { ...c, text: e.target.value };
                  updateQuestion(qi, { ...q, choices });
                }}
                  className="h-10 min-w-0 flex-1 rounded-lg border border-ifma-border bg-admin-surface px-3 text-sm outline-none focus:border-caisbe-red focus:ring-4 focus:ring-caisbe-red/10"
              />
              {q.choices.length > MIN_CHOICES ? (
                <DeleteIconButton
                  label={`Remove choice ${ci + 1}`}
                  className="h-8 w-8"
                  onClick={() => {
                    const removedCorrect = q.choices[ci]?.is_correct;
                    const choices = q.choices
                      .filter((_, idx) => idx !== ci)
                      .map((choice, idx) => ({ ...choice, sort_order: idx }));
                    updateQuestion(qi, {
                      ...q,
                      choices: removedCorrect
                        ? choices.map((choice) => ({ ...choice, is_correct: false }))
                        : choices,
                    });
                  }}
                />
              ) : null}
            </div>
          ))}
          </div>
          {q.choices.length < MAX_CHOICES ? (
            <button
              type="button"
              className="text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark"
              onClick={() =>
                updateQuestion(qi, {
                  ...q,
                  choices: [...q.choices, emptyChoice(q.choices.length)],
                })
              }
            >
              + Add choice
            </button>
          ) : null}
        </div>
      ))}

      <Button
        variant="secondary"
        size="sm"
        onClick={() => onChange([...questions, emptyQuestion()])}
      >
        + Add question
      </Button>

      {error ? <Alert tone="error">{error}</Alert> : null}
    </div>
  );
}
