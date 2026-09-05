"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import CourseCard from "@/components/portal/CourseCard";
import { apiFetch, ApiError, type Course, type Enrollment } from "@/lib/auth";
import type { Certificate } from "@/lib/lms";

export default function StudentDashboardPage() {
  const { user } = useAuth();
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let active = true;
    async function load() {
      setLoading(true);
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
        setError(err instanceof ApiError ? err.detail : "Unable to load dashboard.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [user]);

  const enrolledIds = useMemo(() => new Set(enrollments.map((item) => item.course.id)), [enrollments]);
  const availableCount = courses.filter((course) => !enrolledIds.has(course.id)).length;
  const recent = enrollments.slice(0, 5);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Dashboard</h1>
          <p className="mt-2 text-sm text-caisbe-muted">
            Welcome back, {user?.full_name}. Continue your certificate programs.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/certificates"
            className="inline-flex items-center justify-center rounded-md border-2 border-ifma-border bg-white px-5 py-3 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
          >
            Certificates
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:border-caisbe-red-dark hover:bg-caisbe-red-dark"
          >
            My courses
          </Link>
        </div>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Enrolled courses", value: enrollments.length },
          { label: "Available to enroll", value: availableCount },
          { label: "Certificates", value: certificates.length },
        ].map((item) => (
          <div key={item.label} className="border border-ifma-border bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">{item.label}</p>
            <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
              {loading ? "—" : item.value}
            </p>
          </div>
        ))}
      </div>

      <section className="border border-ifma-border bg-white">
        <div className="flex items-center justify-between border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Continue learning</h2>
          <Link href="/courses" className="text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark">
            See all
          </Link>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : recent.length === 0 ? (
          <div className="p-6">
            <p className="text-sm text-caisbe-muted">You are not enrolled in any courses yet.</p>
            <Link href="/courses" className="mt-3 inline-flex text-sm font-semibold text-caisbe-red hover:text-caisbe-red-dark">
              Browse courses
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 p-6 sm:grid-cols-2 xl:grid-cols-3">
            {recent.map((enrollment) => (
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
    </div>
  );
}
