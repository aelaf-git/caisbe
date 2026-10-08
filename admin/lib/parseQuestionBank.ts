import type { QuizQuestion } from "@/lib/lms";

const QUESTION_LINE = /^\s*\d+\s*[.)]\s+(.+?)\s*$/;
const LETTER_CHOICE = /^\s*(\*+)?\s*([A-Za-z])\s*[.)]\s+(.+?)\s*$/;
const DASH_CHOICE = /^\s*(\*+)?\s*-\s+(.+?)\s*$/;

function markChoice(text: string, starred: boolean): { text: string; correct: boolean } {
  let correct = starred;
  let next = text.trim();
  if (/\s+\*\s*$/.test(next)) {
    correct = true;
    next = next.replace(/\s+\*\s*$/, "").trim();
  }
  if (/\s*\(\s*correct\s*\)\s*$/i.test(next)) {
    correct = true;
    next = next.replace(/\s*\(\s*correct\s*\)\s*$/i, "").trim();
  } else if (/\s+correct\s*$/i.test(next)) {
    correct = true;
    next = next.replace(/\s+correct\s*$/i, "").trim();
  }
  return { text: next, correct };
}

export function parseQuestionBank(raw: string): { questions: QuizQuestion[] } | { error: string } {
  const drafts: { prompt: string[]; choices: { text: string; is_correct: boolean }[] }[] = [];
  let current: (typeof drafts)[number] | null = null;

  for (const line of raw.replace(/\r\n/g, "\n").split("\n")) {
    if (!line.trim()) continue;
    const question = line.match(QUESTION_LINE);
    if (question) {
      current = { prompt: [question[1].trim()], choices: [] };
      drafts.push(current);
      continue;
    }
    if (!current) {
      return { error: "Start each question with a number, such as 1." };
    }
    const letter = line.match(LETTER_CHOICE);
    const dash = line.match(DASH_CHOICE);
    if (letter || dash) {
      const starred = Boolean(letter ? letter[1] : dash?.[1]);
      const body = letter ? letter[3] : (dash?.[2] ?? "");
      const marked = markChoice(body, starred);
      if (!marked.text) {
        return { error: `Question ${drafts.length} has an empty choice.` };
      }
      current.choices.push({ text: marked.text, is_correct: marked.correct });
      continue;
    }
    if (current.choices.length === 0) {
      current.prompt.push(line.trim());
      continue;
    }
    return { error: `Question ${drafts.length} has a line that is not a choice: ${line.trim()}` };
  }

  if (drafts.length === 0) {
    return { error: "Start each question with a number, such as 1." };
  }

  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index];
    const prompt = draft.prompt.join(" ").trim();
    if (!prompt) return { error: `Question ${index + 1} needs a prompt.` };
    if (draft.choices.length < 2) return { error: `Question ${index + 1} needs at least two choices.` };
    const correct = draft.choices.filter((choice) => choice.is_correct).length;
    if (correct !== 1) {
      return {
        error: `Question ${index + 1} needs exactly one correct choice. Mark it with * or (correct).`,
      };
    }
  }

  return {
    questions: drafts.map((draft) => ({
      prompt: draft.prompt.join(" ").trim(),
      sort_order: 0,
      choices: draft.choices.map((choice) => ({
        text: choice.text,
        is_correct: choice.is_correct,
        sort_order: 0,
      })),
    })),
  };
}

function isBlankQuestion(question: QuizQuestion) {
  return !question.prompt.trim() && question.choices.every((choice) => !choice.text.trim());
}

export function appendQuestionBank(existing: QuizQuestion[], added: QuizQuestion[]): QuizQuestion[] {
  const base = existing.every(isBlankQuestion) ? [] : existing;
  return [...base, ...added].map((question, questionIndex) => ({
    ...question,
    sort_order: questionIndex,
    choices: question.choices.map((choice, choiceIndex) => ({
      ...choice,
      sort_order: choiceIndex,
    })),
  }));
}
