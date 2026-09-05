"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { apiFetch, ApiError, type Course, type Enrollment } from "@/lib/auth";

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [enrollmentData, courseData] = await Promise.all([
          apiFetch<Enrollment[]>("/me/enrollments"),
          apiFetch<Course[]>("/courses", { auth: false }),
        ]);
        if (!active) return;
        setEnrollments(enrollmentData);
        setCourses(courseData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.detail : "Unable to load courses.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  const enrolledIds = useMemo(() => new Set(enrollments.map((item) => item.course.id)), [enrollments]);
  const availableCourses = useMemo(
    () => courses.filter((course) => !enrolledIds.has(course.id)),
    [courses, enrolledIds],
  );

  async function handleEnroll(courseId: number) {
    setEnrollingId(courseId);
    setError(null);
    try {
      const enrollment = await apiFetch<Enrollment>("/me/enrollments", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId }),
      });
      setEnrollments((prev) => [enrollment, ...prev]);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to enroll. Please try again.");
    } finally {
      setEnrollingId(null);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">My courses</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Continue enrolled programs or enroll in published certificate courses.
        </p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <section className="border border-ifma-border bg-white">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Enrolled</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading enrollments…</p>
        ) : enrollments.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">
            You are not enrolled in any courses yet. Browse available courses below.
          </p>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {enrollments.map((enrollment) => (
              <li key={enrollment.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                    {enrollment.course.code}
                  </p>
                  <p className="mt-1 font-semibold text-caisbe-text">{enrollment.course.title}</p>
                  <p className="mt-1 text-sm text-caisbe-muted">
                    {enrollment.status} · {enrollment.progress}% complete
                  </p>
                </div>
                <Link
                  href={`/courses/${enrollment.course.id}`}
                  className="text-sm font-semibold uppercase tracking-wide text-caisbe-red hover:text-caisbe-red-dark"
                >
                  Continue
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border border-ifma-border bg-white">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Available courses</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading courses…</p>
        ) : availableCourses.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">
            {courses.length === 0
              ? "No published courses yet. Check back after new programs are uploaded."
              : "You are enrolled in every available course. Great work!"}
          </p>
        ) : (
          <ul className="divide-y divide-ifma-border-light">
            {availableCourses.map((course) => (
              <li key={course.id} className="flex flex-wrap items-start justify-between gap-4 px-6 py-4">
                <div className="max-w-2xl">
                  <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">{course.code}</p>
                  <p className="mt-1 font-semibold text-caisbe-text">{course.title}</p>
                  <p className="mt-1 text-sm text-caisbe-muted">{course.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleEnroll(course.id)}
                  disabled={enrollingId === course.id}
                  className="inline-flex min-w-[140px] items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark disabled:opacity-60"
                >
                  {enrollingId === course.id ? "Enrolling…" : "Enroll"}
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
