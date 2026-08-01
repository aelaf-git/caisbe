"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { apiFetch, apiUpload, ApiError } from "@/lib/auth";
import type { ContentBlock, CourseDetail, QuizQuestion } from "@/lib/lms";

const BLOCK_TYPES = ["text", "video", "pdf", "link", "quiz", "assignment"] as const;

function emptyQuestion(): QuizQuestion {
  return {
    prompt: "",
    sort_order: 0,
    choices: [
      { text: "", is_correct: true, sort_order: 0 },
      { text: "", is_correct: false, sort_order: 1 },
    ],
  };
}

export default function AdminCourseEditorPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [meta, setMeta] = useState({
    code: "",
    title: "",
    description: "",
    slug: "",
    pass_percent: 70,
    status: "draft",
  });

  const [chapterTitle, setChapterTitle] = useState("");
  const [lessonTitles, setLessonTitles] = useState<Record<number, string>>({});
  const [blockDrafts, setBlockDrafts] = useState<
    Record<
      number,
      {
        block_type: (typeof BLOCK_TYPES)[number];
        title: string;
        body: string;
        url: string;
        label: string;
        quiz_title: string;
        questions: QuizQuestion[];
      }
    >
  >({});

  const [examTitle, setExamTitle] = useState("Final Exam");
  const [examPass, setExamPass] = useState(70);
  const [examQuestions, setExamQuestions] = useState<QuizQuestion[]>([emptyQuestion()]);
  const [certTitle, setCertTitle] = useState("Certificate of Completion");
  const [certBody, setCertBody] = useState(
    "This certifies that {student_name} has successfully completed {course_title}.",
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`);
      setCourse(data);
      setMeta({
        code: data.code,
        title: data.title,
        description: data.description,
        slug: data.slug,
        pass_percent: data.pass_percent,
        status: data.status,
      });
      setExamTitle(data.final_exam?.title ?? "Final Exam");
      setExamPass(data.final_exam?.pass_percent ?? data.pass_percent);
      setExamQuestions(
        data.final_exam?.questions?.length
          ? data.final_exam.questions.map((q) => ({
              prompt: q.prompt,
              sort_order: q.sort_order,
              choices: q.choices.map((c) => ({
                text: c.text,
                is_correct: Boolean(c.is_correct),
                sort_order: c.sort_order,
              })),
            }))
          : [emptyQuestion()],
      );
      setCertTitle(data.certificate_template?.title ?? "Certificate of Completion");
      setCertBody(
        data.certificate_template?.body ??
          "This certifies that {student_name} has successfully completed {course_title}.",
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to load course.");
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveMeta(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify(meta),
      });
      setCourse(updated);
      setMessage("Course details saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save course.");
    } finally {
      setSaving(false);
    }
  }

  async function togglePublish() {
    const next = meta.status === "published" ? "draft" : "published";
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<CourseDetail>(`/admin/courses/${courseId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: next }),
      });
      setCourse(updated);
      setMeta((m) => ({ ...m, status: updated.status }));
      setMessage(next === "published" ? "Course published to student portal." : "Course unpublished.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to update status.");
    } finally {
      setSaving(false);
    }
  }

  async function addChapter(event: FormEvent) {
    event.preventDefault();
    if (!chapterTitle.trim()) return;
    try {
      await apiFetch(`/admin/courses/${courseId}/chapters`, {
        method: "POST",
        body: JSON.stringify({
          title: chapterTitle,
          sort_order: course?.chapters.length ?? 0,
        }),
      });
      setChapterTitle("");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to add chapter.");
    }
  }

  async function addLesson(chapterId: number) {
    const title = lessonTitles[chapterId]?.trim();
    if (!title) return;
    try {
      const chapter = course?.chapters.find((c) => c.id === chapterId);
      await apiFetch(`/admin/chapters/${chapterId}/lessons`, {
        method: "POST",
        body: JSON.stringify({
          title,
          sort_order: chapter?.lessons.length ?? 0,
        }),
      });
      setLessonTitles((prev) => ({ ...prev, [chapterId]: "" }));
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to add lesson.");
    }
  }

  async function deleteChapter(chapterId: number) {
    if (!confirm("Delete this chapter and its lessons?")) return;
    await apiFetch(`/admin/chapters/${chapterId}`, { method: "DELETE" });
    await load();
  }

  async function deleteLesson(lessonId: number) {
    if (!confirm("Delete this lesson?")) return;
    await apiFetch(`/admin/lessons/${lessonId}`, { method: "DELETE" });
    await load();
  }

  function ensureBlockDraft(lessonId: number) {
    setBlockDrafts((prev) => {
      if (prev[lessonId]) return prev;
      return {
        ...prev,
        [lessonId]: {
          block_type: "text",
          title: "",
          body: "",
          url: "",
          label: "",
          quiz_title: "Quiz",
          questions: [emptyQuestion()],
        },
      };
    });
  }

  async function uploadForLesson(lessonId: number, file: File) {
    ensureBlockDraft(lessonId);
    const uploaded = await apiUpload("/admin/uploads", file);
    setBlockDrafts((prev) => ({
      ...prev,
      [lessonId]: {
        ...(prev[lessonId] ?? {
          block_type: "pdf",
          title: "",
          body: "",
          url: "",
          label: "",
          quiz_title: "Quiz",
          questions: [emptyQuestion()],
        }),
        url: uploaded.url,
      },
    }));
  }

  async function addBlock(lessonId: number) {
    const draft = blockDrafts[lessonId];
    if (!draft) return;
    try {
      await apiFetch(`/admin/lessons/${lessonId}/blocks`, {
        method: "POST",
        body: JSON.stringify({
          block_type: draft.block_type,
          title: draft.title || null,
          body: draft.body || null,
          url: draft.url || null,
          label: draft.label || null,
          sort_order: course?.chapters
            .flatMap((c) => c.lessons)
            .find((l) => l.id === lessonId)?.blocks.length ?? 0,
          quiz_title: draft.quiz_title,
          quiz_questions: draft.block_type === "quiz" ? draft.questions : [],
        }),
      });
      setBlockDrafts((prev) => {
        const next = { ...prev };
        delete next[lessonId];
        return next;
      });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to add content block.");
    }
  }

  async function deleteBlock(blockId: number) {
    if (!confirm("Delete this content block?")) return;
    await apiFetch(`/admin/blocks/${blockId}`, { method: "DELETE" });
    await load();
  }

  async function saveExam(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch(`/admin/courses/${courseId}/final-exam`, {
        method: "PUT",
        body: JSON.stringify({
          title: examTitle,
          pass_percent: examPass,
          questions: examQuestions,
        }),
      });
      setMessage("Final exam saved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save exam.");
    }
  }

  async function saveCertificate(event: FormEvent) {
    event.preventDefault();
    try {
      await apiFetch(`/admin/courses/${courseId}/certificate-template`, {
        method: "PUT",
        body: JSON.stringify({ title: certTitle, body: certBody }),
      });
      setMessage("Certificate template saved.");
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save certificate.");
    }
  }

  if (loading) {
    return <p className="text-sm text-caisbe-muted">Loading course…</p>;
  }

  if (!course) {
    return <p className="text-sm text-caisbe-red">{error ?? "Course not found."}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link href="/courses" className="text-sm text-caisbe-muted hover:text-caisbe-green">
            ← All courses
          </Link>
          <h1 className="mt-2 font-display text-3xl font-semibold text-caisbe-green">{course.title}</h1>
          <p className="mt-1 text-sm text-caisbe-muted">
            Status: <span className="font-semibold">{meta.status}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => void togglePublish()}
          disabled={saving}
          className="inline-flex items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {meta.status === "published" ? "Unpublish" : "Publish"}
        </button>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {message ? <p className="text-sm text-caisbe-green">{message}</p> : null}

      <form onSubmit={saveMeta} className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold">Course details</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <input
            className="h-11 rounded-md border border-ifma-border px-3 text-sm"
            value={meta.code}
            onChange={(e) => setMeta({ ...meta, code: e.target.value })}
            placeholder="Code"
          />
          <input
            className="h-11 rounded-md border border-ifma-border px-3 text-sm"
            value={meta.slug}
            onChange={(e) => setMeta({ ...meta, slug: e.target.value })}
            placeholder="Slug"
          />
        </div>
        <input
          className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
          value={meta.title}
          onChange={(e) => setMeta({ ...meta, title: e.target.value })}
          placeholder="Title"
        />
        <textarea
          className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm"
          rows={3}
          value={meta.description}
          onChange={(e) => setMeta({ ...meta, description: e.target.value })}
        />
        <label className="block text-sm">
          Pass percent
          <input
            type="number"
            min={0}
            max={100}
            className="mt-1 h-11 w-32 rounded-md border border-ifma-border px-3 text-sm"
            value={meta.pass_percent}
            onChange={(e) => setMeta({ ...meta, pass_percent: Number(e.target.value) })}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase text-white"
        >
          Save details
        </button>
      </form>

      <section className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold">Chapters & lessons</h2>
        <form onSubmit={addChapter} className="flex flex-wrap gap-2">
          <input
            value={chapterTitle}
            onChange={(e) => setChapterTitle(e.target.value)}
            placeholder="New chapter title"
            className="h-11 min-w-[220px] flex-1 rounded-md border border-ifma-border px-3 text-sm"
          />
          <button type="submit" className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green">
            Add chapter
          </button>
        </form>

        {course.chapters.map((chapter) => (
          <div key={chapter.id} className="border border-ifma-border-light p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold text-caisbe-text">{chapter.title}</h3>
              <button
                type="button"
                onClick={() => void deleteChapter(chapter.id)}
                className="text-sm text-caisbe-red"
              >
                Delete chapter
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {chapter.lessons.map((lesson) => {
                const draft = blockDrafts[lesson.id];
                return (
                  <div key={lesson.id} className="bg-[#fafafa] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{lesson.title}</p>
                      <button
                        type="button"
                        onClick={() => void deleteLesson(lesson.id)}
                        className="text-sm text-caisbe-red"
                      >
                        Delete lesson
                      </button>
                    </div>

                    <ul className="mt-3 space-y-2 text-sm">
                      {lesson.blocks.map((block: ContentBlock) => (
                        <li
                          key={block.id}
                          className="flex flex-wrap items-center justify-between gap-2 border-b border-ifma-border-light py-2"
                        >
                          <span>
                            <span className="font-semibold uppercase text-caisbe-red">{block.block_type}</span>
                            {block.title ? ` — ${block.title}` : null}
                            {block.url ? ` (${block.url})` : null}
                            {block.block_type === "quiz" && block.quiz
                              ? ` · ${block.quiz.questions.length} questions`
                              : null}
                          </span>
                          <button
                            type="button"
                            onClick={() => void deleteBlock(block.id)}
                            className="text-caisbe-red"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>

                    <div className="mt-4 space-y-3 border-t border-ifma-border-light pt-4">
                      <button
                        type="button"
                        onClick={() => ensureBlockDraft(lesson.id)}
                        className="text-sm font-semibold text-caisbe-green"
                      >
                        + Add content block
                      </button>
                      {draft ? (
                        <div className="space-y-3">
                          <select
                            value={draft.block_type}
                            onChange={(e) =>
                              setBlockDrafts((prev) => ({
                                ...prev,
                                [lesson.id]: {
                                  ...draft,
                                  block_type: e.target.value as (typeof BLOCK_TYPES)[number],
                                },
                              }))
                            }
                            className="h-11 rounded-md border border-ifma-border px-3 text-sm"
                          >
                            {BLOCK_TYPES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                          <input
                            placeholder="Title"
                            value={draft.title}
                            onChange={(e) =>
                              setBlockDrafts((prev) => ({
                                ...prev,
                                [lesson.id]: { ...draft, title: e.target.value },
                              }))
                            }
                            className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
                          />
                          {["text", "assignment"].includes(draft.block_type) ? (
                            <textarea
                              placeholder={draft.block_type === "assignment" ? "Assignment prompt" : "Body text"}
                              value={draft.body}
                              onChange={(e) =>
                                setBlockDrafts((prev) => ({
                                  ...prev,
                                  [lesson.id]: { ...draft, body: e.target.value },
                                }))
                              }
                              rows={4}
                              className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm"
                            />
                          ) : null}
                          {["video", "pdf", "link"].includes(draft.block_type) ? (
                            <div className="space-y-2">
                              <input
                                placeholder="URL (or upload below)"
                                value={draft.url}
                                onChange={(e) =>
                                  setBlockDrafts((prev) => ({
                                    ...prev,
                                    [lesson.id]: { ...draft, url: e.target.value },
                                  }))
                                }
                                className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
                              />
                              {draft.block_type === "link" ? (
                                <input
                                  placeholder="Link label"
                                  value={draft.label}
                                  onChange={(e) =>
                                    setBlockDrafts((prev) => ({
                                      ...prev,
                                      [lesson.id]: { ...draft, label: e.target.value },
                                    }))
                                  }
                                  className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
                                />
                              ) : null}
                              {["video", "pdf"].includes(draft.block_type) ? (
                                <input
                                  type="file"
                                  accept={draft.block_type === "video" ? "video/*" : "application/pdf"}
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) void uploadForLesson(lesson.id, file);
                                  }}
                                />
                              ) : null}
                            </div>
                          ) : null}
                          {draft.block_type === "quiz" ? (
                            <div className="space-y-3">
                              <input
                                placeholder="Quiz title"
                                value={draft.quiz_title}
                                onChange={(e) =>
                                  setBlockDrafts((prev) => ({
                                    ...prev,
                                    [lesson.id]: { ...draft, quiz_title: e.target.value },
                                  }))
                                }
                                className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
                              />
                              {draft.questions.map((q, qi) => (
                                <div key={qi} className="space-y-2 border border-ifma-border-light p-3">
                                  <input
                                    placeholder="Question"
                                    value={q.prompt}
                                    onChange={(e) => {
                                      const questions = [...draft.questions];
                                      questions[qi] = { ...q, prompt: e.target.value };
                                      setBlockDrafts((prev) => ({
                                        ...prev,
                                        [lesson.id]: { ...draft, questions },
                                      }));
                                    }}
                                    className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
                                  />
                                  {q.choices.map((c, ci) => (
                                    <div key={ci} className="flex items-center gap-2">
                                      <input
                                        type="radio"
                                        name={`correct-${lesson.id}-${qi}`}
                                        checked={Boolean(c.is_correct)}
                                        onChange={() => {
                                          const questions = [...draft.questions];
                                          questions[qi] = {
                                            ...q,
                                            choices: q.choices.map((choice, idx) => ({
                                              ...choice,
                                              is_correct: idx === ci,
                                            })),
                                          };
                                          setBlockDrafts((prev) => ({
                                            ...prev,
                                            [lesson.id]: { ...draft, questions },
                                          }));
                                        }}
                                      />
                                      <input
                                        placeholder={`Choice ${ci + 1}`}
                                        value={c.text}
                                        onChange={(e) => {
                                          const questions = [...draft.questions];
                                          const choices = [...q.choices];
                                          choices[ci] = { ...c, text: e.target.value };
                                          questions[qi] = { ...q, choices };
                                          setBlockDrafts((prev) => ({
                                            ...prev,
                                            [lesson.id]: { ...draft, questions },
                                          }));
                                        }}
                                        className="h-10 flex-1 rounded-md border border-ifma-border px-3 text-sm"
                                      />
                                    </div>
                                  ))}
                                </div>
                              ))}
                              <button
                                type="button"
                                className="text-sm text-caisbe-green"
                                onClick={() =>
                                  setBlockDrafts((prev) => ({
                                    ...prev,
                                    [lesson.id]: {
                                      ...draft,
                                      questions: [...draft.questions, emptyQuestion()],
                                    },
                                  }))
                                }
                              >
                                + Question
                              </button>
                            </div>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => void addBlock(lesson.id)}
                            className="border-2 border-caisbe-green bg-caisbe-green px-4 py-2 text-sm font-semibold uppercase text-white"
                          >
                            Save block
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <input
                value={lessonTitles[chapter.id] ?? ""}
                onChange={(e) =>
                  setLessonTitles((prev) => ({ ...prev, [chapter.id]: e.target.value }))
                }
                placeholder="New lesson title"
                className="h-11 min-w-[200px] flex-1 rounded-md border border-ifma-border px-3 text-sm"
              />
              <button
                type="button"
                onClick={() => void addLesson(chapter.id)}
                className="border-2 border-caisbe-green px-4 py-2 text-sm font-semibold text-caisbe-green"
              >
                Add lesson
              </button>
            </div>
          </div>
        ))}
      </section>

      <form onSubmit={saveExam} className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold">Final exam</h2>
        <input
          value={examTitle}
          onChange={(e) => setExamTitle(e.target.value)}
          className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
        />
        <label className="block text-sm">
          Pass percent
          <input
            type="number"
            min={0}
            max={100}
            value={examPass}
            onChange={(e) => setExamPass(Number(e.target.value))}
            className="mt-1 h-11 w-32 rounded-md border border-ifma-border px-3 text-sm"
          />
        </label>
        {examQuestions.map((q, qi) => (
          <div key={qi} className="space-y-2 border border-ifma-border-light p-3">
            <input
              placeholder="Question"
              value={q.prompt}
              onChange={(e) => {
                const next = [...examQuestions];
                next[qi] = { ...q, prompt: e.target.value };
                setExamQuestions(next);
              }}
              className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
            />
            {q.choices.map((c, ci) => (
              <div key={ci} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={`exam-correct-${qi}`}
                  checked={Boolean(c.is_correct)}
                  onChange={() => {
                    const next = [...examQuestions];
                    next[qi] = {
                      ...q,
                      choices: q.choices.map((choice, idx) => ({
                        ...choice,
                        is_correct: idx === ci,
                      })),
                    };
                    setExamQuestions(next);
                  }}
                />
                <input
                  value={c.text}
                  onChange={(e) => {
                    const next = [...examQuestions];
                    const choices = [...q.choices];
                    choices[ci] = { ...c, text: e.target.value };
                    next[qi] = { ...q, choices };
                    setExamQuestions(next);
                  }}
                  className="h-10 flex-1 rounded-md border border-ifma-border px-3 text-sm"
                />
              </div>
            ))}
          </div>
        ))}
        <button
          type="button"
          className="text-sm text-caisbe-green"
          onClick={() => setExamQuestions((prev) => [...prev, emptyQuestion()])}
        >
          + Exam question
        </button>
        <div>
          <button
            type="submit"
            className="border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase text-white"
          >
            Save final exam
          </button>
        </div>
      </form>

      <form onSubmit={saveCertificate} className="space-y-4 border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold">Certificate template</h2>
        <p className="text-xs text-caisbe-muted">
          Use {"{student_name}"} and {"{course_title}"} placeholders.
        </p>
        <input
          value={certTitle}
          onChange={(e) => setCertTitle(e.target.value)}
          className="h-11 w-full rounded-md border border-ifma-border px-3 text-sm"
        />
        <textarea
          value={certBody}
          onChange={(e) => setCertBody(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-ifma-border px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="border-2 border-caisbe-green bg-caisbe-green px-6 py-3 text-sm font-semibold uppercase text-white"
        >
          Save certificate
        </button>
      </form>
    </div>
  );
}
