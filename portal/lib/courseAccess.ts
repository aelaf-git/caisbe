import type { CourseDetail, Lesson } from "@/lib/lms";
import type { NavSelection } from "@/components/portal/coursePlayerTypes";

function topicsComplete(lessons: Lesson[]): boolean {
  return lessons.every((lesson) => Boolean(lesson.completed));
}

export function chapterUnlocked(course: CourseDetail, chapterIndex: number): boolean {
  if (chapterIndex <= 0) return true;
  for (let index = 0; index < chapterIndex; index += 1) {
    if (!topicsComplete(course.chapters[index]?.lessons ?? [])) return false;
  }
  return true;
}

export function topicUnlocked(course: CourseDetail, chapterIndex: number, topicIndex: number): boolean {
  if (!chapterUnlocked(course, chapterIndex)) return false;
  const earlier = course.chapters[chapterIndex]?.lessons.slice(0, topicIndex) ?? [];
  return topicsComplete(earlier);
}

export function chapterExtrasUnlocked(course: CourseDetail, chapterIndex: number): boolean {
  if (!chapterUnlocked(course, chapterIndex)) return false;
  return topicsComplete(course.chapters[chapterIndex]?.lessons ?? []);
}

export function examUnlocked(course: CourseDetail): boolean {
  return course.chapters.every((chapter) => topicsComplete(chapter.lessons));
}

export function selectionUnlocked(course: CourseDetail, selection: NavSelection | null): boolean {
  if (!selection) return true;
  if (selection.kind === "exam") return examUnlocked(course);
  if (selection.kind === "chapter-readings") {
    const chapterIndex = course.chapters.findIndex((chapter) => chapter.id === selection.chapterId);
    return chapterIndex >= 0 && chapterUnlocked(course, chapterIndex);
  }
  if (selection.kind === "topic") {
    for (let chapterIndex = 0; chapterIndex < course.chapters.length; chapterIndex += 1) {
      const topicIndex = course.chapters[chapterIndex].lessons.findIndex(
        (lesson) => lesson.id === selection.topicId,
      );
      if (topicIndex >= 0) return topicUnlocked(course, chapterIndex, topicIndex);
    }
    return false;
  }
  if (selection.kind === "chapter-block") {
    for (let chapterIndex = 0; chapterIndex < course.chapters.length; chapterIndex += 1) {
      const found = (course.chapters[chapterIndex].blocks ?? []).some((block) => block.id === selection.blockId);
      if (found) return chapterExtrasUnlocked(course, chapterIndex);
    }
    return false;
  }
  return true;
}
