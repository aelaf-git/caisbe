"use client";

import { DeleteIconButton } from "@/components/ui/IconTrash";
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
    <div className="space-y-3">
      <p className="text-xs text-caisbe-muted">
        Select the radio button next to the correct answer for each question.
      </p>

      {questions.map((q, qi) => (
        <div key={qi} className="space-y-2 border border-ifma-border-light p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
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
            className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
          />
          {q.choices.map((c, ci) => (
            <div key={ci} className="flex items-center gap-2">
              <label className="flex shrink-0 items-center gap-1.5 text-xs text-caisbe-muted">
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
                className="h-10 flex-1 rounded-md border border-ifma-border px-3 text-sm outline-none focus:border-caisbe-green"
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
          {q.choices.length < MAX_CHOICES ? (
            <button
              type="button"
              className="text-sm font-medium text-caisbe-green hover:text-caisbe-green-mid"
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

      <button
        type="button"
        className="text-sm font-medium text-caisbe-green hover:text-caisbe-green-mid"
        onClick={() => onChange([...questions, emptyQuestion()])}
      >
        + Question
      </button>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
    </div>
  );
}
