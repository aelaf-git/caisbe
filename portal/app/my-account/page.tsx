"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { apiFetch, ApiError, type Course, type Enrollment } from "@/lib/auth";
import type { Certificate } from "@/lib/lms";

export default function MyAccountPage() {
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
    if (!loading && user?.role === "admin") {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;

    let active = true;

    async function load() {
      setDataLoading(true);
      setError(null);
      try {
        const [enrollmentData, courseData, certData] = await Promise.all([
          apiFetch<Enrollment[]>("/me/enrollments"),
          apiFetch<Course[]>("/courses", { auth: false }),
          apiFetch<Certificate[]>("/me/certificates"),
        ]);
        if (!active) return;
        setEnrollments(enrollmentData);
        setCourses(courseData);
        setCertificates(certData);
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.detail : "Unable to load your courses.");
      } finally {
        if (active) setDataLoading(false);
      }
    }

    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.map((item) => item.course.id)),
    [enrollments],
  );

  const availableCourses = useMemo(
    () => courses.filter((course) => !enrolledCourseIds.has(course.id)),
    [courses, enrolledCourseIds],
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

  function handleLogout() {
    logout();
    router.push("/login");
  }

  if (loading || !user) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-16 text-center text-sm text-caisbe-muted">
        Loading…
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-caisbe-green">My Account</h1>
          <p className="mt-2 text-sm text-caisbe-muted">
            Welcome back, {user.full_name}. Manage your enrolled certificate programs.
          </p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="inline-flex items-center justify-center border-2 border-caisbe-green bg-white px-6 py-3 text-sm font-semibold uppercase tracking-wide text-caisbe-green transition-colors hover:text-caisbe-red"
        >
          Logout
        </button>
      </div>

      {error ? <p className="mt-6 text-sm text-caisbe-red">{error}</p> : null}

      <div className="mt-10 space-y-12">
        <div>
          <h2 className="text-xl font-semibold text-caisbe-text">My Enrolled Courses</h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Programs you are currently taking.
          </p>

          {dataLoading ? (
            <p className="mt-6 text-sm text-caisbe-muted">Loading enrollments…</p>
          ) : enrollments.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">
              You are not enrolled in any courses yet. Browse available courses below to get started.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-ifma-border-light border-y border-ifma-border-light">
              {enrollments.map((enrollment) => (
                <li key={enrollment.id} className="flex flex-wrap items-start justify-between gap-3 py-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                      {enrollment.course.code}
                    </p>
                    <Link
                      href={`/my-account/courses/${enrollment.course.id}`}
                      className="mt-1 block text-base font-semibold text-caisbe-text hover:text-caisbe-green"
                    >
                      {enrollment.course.title}
                    </Link>
                    <p className="mt-1 text-sm text-caisbe-muted">
                      Status: {enrollment.status} · Progress: {enrollment.progress}%
                    </p>
                  </div>
                  <Link
                    href={`/my-account/courses/${enrollment.course.id}`}
                    className="text-sm font-semibold uppercase tracking-wide text-caisbe-green hover:text-caisbe-red"
                  >
                    Continue
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-caisbe-text">Available Courses</h2>
          <p className="mt-1 text-sm text-caisbe-muted">
            Published programs ready for enrollment.
          </p>

          {dataLoading ? (
            <p className="mt-6 text-sm text-caisbe-muted">Loading courses…</p>
          ) : availableCourses.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">
              {courses.length === 0
                ? "No published courses yet. Check back after new programs are uploaded."
                : "You are enrolled in every available course. Great work!"}
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-ifma-border-light border-y border-ifma-border-light">
              {availableCourses.map((course) => (
                <li key={course.id} className="flex flex-wrap items-start justify-between gap-4 py-4">
                  <div className="max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">
                      {course.code}
                    </p>
                    <p className="mt-1 text-base font-semibold text-caisbe-text">{course.title}</p>
                    <p className="mt-1 text-sm text-caisbe-muted">{course.description}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleEnroll(course.id)}
                    disabled={enrollingId === course.id}
                    className="inline-flex min-w-[140px] items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-red-dark disabled:opacity-60"
                  >
                    {enrollingId === course.id ? "Enrolling…" : "Enroll"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold text-caisbe-text">Certificates</h2>
          {dataLoading ? (
            <p className="mt-6 text-sm text-caisbe-muted">Loading…</p>
          ) : certificates.length === 0 ? (
            <p className="mt-6 text-sm text-caisbe-muted">
              Complete a final exam to earn a digital certificate.
            </p>
          ) : (
            <ul className="mt-6 divide-y divide-ifma-border-light border-y border-ifma-border-light">
              {certificates.map((cert) => (
                <li key={cert.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div>
                    <p className="font-semibold text-caisbe-text">{cert.course.title}</p>
                    <p className="text-sm text-caisbe-muted">{cert.certificate_code}</p>
                  </div>
                  <Link
                    href={`/my-account/certificates/${cert.certificate_code}`}
                    className="text-sm font-semibold uppercase tracking-wide text-caisbe-green hover:text-caisbe-red"
                  >
                    View
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
