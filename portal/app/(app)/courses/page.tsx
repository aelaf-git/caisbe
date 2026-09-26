"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import CourseCard from "@/components/portal/CourseCard";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError, type Course, type Enrollment } from "@/lib/auth";
import { formatMoney, type Cart } from "@/lib/commerce";

function isActive(status: string) {
  return status === "enrolled" || status === "completed";
}

export default function StudentCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [cartIds, setCartIds] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<number | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [enrollmentData, courseData, cartData] = await Promise.all([
          apiFetch<Enrollment[]>("/me/enrollments"),
          apiFetch<Course[]>("/courses", { auth: false }),
          apiFetch<Cart>("/me/cart").catch(() => ({ items: [], count: 0, subtotal_cents: 0, currency: "usd" })),
        ]);
        if (!active) return;
        setEnrollments(enrollmentData);
        setCourses(courseData);
        setCartIds(new Set(cartData.items.map((item) => item.course_id)));
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

  const enrolledCourseIds = useMemo(
    () => new Set(enrollments.filter((item) => isActive(item.status)).map((item) => item.course.id)),
    [enrollments],
  );
  const availableCourses = useMemo(
    () => courses.filter((course) => !enrolledCourseIds.has(course.id)),
    [courses, enrolledCourseIds],
  );
  const openEnrollments = enrollments.filter((item) => isActive(item.status));
  const pendingEnrollments = enrollments.filter((item) => item.status === "pending_payment");

  async function addToCart(courseId: number) {
    setAddingId(courseId);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/me/cart", {
        method: "POST",
        body: JSON.stringify({ course_id: courseId }),
      });
      setCartIds((current) => new Set(current).add(courseId));
      setMessage("Added to cart.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to add to cart.");
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning"
        title="My courses"
        description="Add courses to your cart and pay together, or buy a single course now."
        actions={
          <Link
            href="/cart"
            className="inline-flex h-11 items-center rounded-md border-2 border-ifma-border px-5 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
          >
            View cart
          </Link>
        }
      />

      {error ? (
        <div className="border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">{error}</div>
      ) : null}
      {message ? (
        <p className="text-sm text-caisbe-text">
          {message}{" "}
          <Link href="/cart" className="font-semibold text-caisbe-red hover:underline">
            View cart
          </Link>
        </p>
      ) : null}

      {pendingEnrollments.length > 0 ? (
        <section className="border border-ifma-border bg-admin-surface">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="text-lg font-semibold text-caisbe-text">Awaiting payment</h2>
          </div>
          <div className="divide-y divide-ifma-border-light">
            {pendingEnrollments.map((enrollment) => (
              <CourseCard
                key={enrollment.id}
                course={enrollment.course}
                action={{ href: `/courses/${enrollment.course.id}/checkout`, label: "Complete payment" }}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section className="border border-ifma-border bg-admin-surface">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Enrolled</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading enrollments…</p>
        ) : openEnrollments.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">
            You do not have access to a course yet. Choose a program below and complete checkout.
          </p>
        ) : (
          <div className="divide-y divide-ifma-border-light">
            {openEnrollments.map((enrollment) => {
              const completed = Boolean(enrollment.certificate_code);
              return (
                <CourseCard
                  key={enrollment.id}
                  course={enrollment.course}
                  progress={enrollment.progress}
                  action={{
                    href: `/courses/${enrollment.course.id}`,
                    label: completed ? "Completed" : "Continue",
                    tone: completed ? "complete" : "primary",
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="border border-ifma-border bg-admin-surface">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="text-lg font-semibold text-caisbe-text">Available courses</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading courses…</p>
        ) : availableCourses.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">
            {courses.length === 0
              ? "No published courses yet. Check back after new programs are uploaded."
              : "You already have access to every available course."}
          </p>
        ) : (
          <div className="divide-y divide-ifma-border-light">
            {availableCourses.map((course) => {
              const inCart = cartIds.has(course.id);
              return (
                <CourseCard
                  key={course.id}
                  course={course}
                  action={
                    inCart
                      ? { href: "/cart", label: "In cart · View" }
                      : {
                          onClick: () => void addToCart(course.id),
                          label: addingId === course.id ? "Adding…" : "Add to cart",
                          busy: addingId === course.id,
                        }
                  }
                  secondaryAction={{
                    href: `/courses/${course.id}/checkout`,
                    label: `Buy now · ${formatMoney(course.price_cents ?? 0, course.currency)}`,
                  }}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
