"use client";

import { useEffect, useMemo, useState } from "react";
import CourseCard from "@/components/portal/CourseCard";
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
          <div className="grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {enrollments.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                course={enrollment.course}
                progress={enrollment.progress}
                action={{ href: `/courses/${enrollment.course.id}`, label: "Continue" }}
              />
            ))}
          </div>
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
          <div className="grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {availableCourses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                action={{
                  onClick: () => void handleEnroll(course.id),
                  label: enrollingId === course.id ? "Enrolling…" : "Enroll",
                  busy: enrollingId === course.id,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
