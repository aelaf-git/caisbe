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
      const detail = err instanceof ApiError ? err.detail : "Unable to add to cart.";
      setError(
        /already enrolled/i.test(detail)
          ? "You already have this course. Other programs below are still available."
          : detail,
      );
    } finally {
      setAddingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Learning"
        title="My courses"
        description="Add courses to your cart and buy them together, or buy a single course now."
        actions={
          <Link
            href="/cart"
            className="inline-flex h-11 items-center rounded-full border-2 border-ifma-border px-5 text-sm font-bold text-caisbe-text hover:border-caisbe-red hover:text-caisbe-red"
          >
            View cart
          </Link>
        }
      />

      {error ? (
        <div className="rounded-[20px] border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
          {error}
        </div>
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
        <section className="space-y-4">
          <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Awaiting payment</h2>
          <div className="space-y-4">
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

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">Enrolled</h2>
        {loading ? (
          <p className="border border-ifma-border bg-admin-surface px-5 py-6 text-sm text-caisbe-muted shadow-brand-card">
            Loading enrollments…
          </p>
        ) : openEnrollments.length === 0 ? (
          <p className="border border-ifma-border bg-admin-surface px-5 py-6 text-sm text-caisbe-muted shadow-brand-card">
            You do not have access to a course yet. Choose a program below and buy to unlock it.
          </p>
        ) : (
          <div className="space-y-4">
            {openEnrollments.map((enrollment) => {
              const completed = Boolean(enrollment.certificate_code);
              return (
                <CourseCard
                  key={enrollment.id}
                  course={enrollment.course}
                  progress={enrollment.progress}
                  action={{
                    href: `/courses/${enrollment.course.id}`,
                    label: completed ? "Review course" : "Continue",
                    tone: completed ? "complete" : "primary",
                  }}
                />
              );
            })}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-display text-xl font-semibold text-caisbe-text-dark">
          {openEnrollments.length > 0 ? "Add another course" : "Available courses"}
        </h2>
        {openEnrollments.length > 0 ? (
          <p className="text-sm text-caisbe-muted">
            You can add any other published course to your cart, or buy it on its own.
          </p>
        ) : null}
        {loading ? (
          <p className="border border-ifma-border bg-admin-surface px-5 py-6 text-sm text-caisbe-muted shadow-brand-card">
            Loading courses…
          </p>
        ) : availableCourses.length === 0 ? (
          <p className="border border-ifma-border bg-admin-surface px-5 py-6 text-sm text-caisbe-muted shadow-brand-card">
            {courses.length === 0
              ? "No published courses yet. Check back after new programs are uploaded."
              : "You already have access to every available course."}
          </p>
        ) : (
          <div className="space-y-4">
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
