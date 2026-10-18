"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import BackButton from "@/components/ui/BackButton";
import PageHeader from "@/components/ui/PageHeader";
import { apiFetch, ApiError, type Course, type Enrollment } from "@/lib/auth";
import { formatMoney, type Cart } from "@/lib/commerce";
import { courseShortSummary } from "@/lib/courseSummary";
import { resolveUploadUrl } from "@/lib/mediaUrl";

function isActive(status: string) {
  return status === "enrolled" || status === "completed";
}

export default function CourseSummaryPage() {
  const params = useParams<{ id: string }>();
  const courseId = Number(params.id);
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [inCart, setInCart] = useState(false);
  const [enrolled, setEnrolled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [courses, enrollments, cart] = await Promise.all([
          apiFetch<Course[]>("/courses", { auth: false }),
          apiFetch<Enrollment[]>("/me/enrollments").catch(() => [] as Enrollment[]),
          apiFetch<Cart>("/me/cart").catch(() => ({
            items: [],
            count: 0,
            subtotal_cents: 0,
            currency: "usd",
          })),
        ]);
        if (!active) return;
        const found = courses.find((item) => item.id === courseId) ?? null;
        if (!found) {
          setCourse(null);
          setError("This course is not available.");
          return;
        }
        setCourse(found);
        setInCart(cart.items.some((item) => item.course_id === courseId));
        setEnrolled(
          enrollments.some((row) => row.course.id === courseId && isActive(row.status)),
        );
      } catch (err) {
        if (!active) return;
        setError(err instanceof ApiError ? err.detail : "Unable to load course.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, [courseId]);

  useEffect(() => {
    if (enrolled) {
      router.replace(`/courses/${courseId}`);
    }
  }, [enrolled, courseId, router]);

  async function addToCart() {
    if (!course) return;
    setAdding(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/me/cart", {
        method: "POST",
        body: JSON.stringify({ course_id: course.id }),
      });
      setInCart(true);
      setMessage("Added to cart.");
    } catch (err) {
      const detail = err instanceof ApiError ? err.detail : "Unable to add to cart.";
      setError(
        /already enrolled/i.test(detail)
          ? "You already have this course."
          : detail,
      );
    } finally {
      setAdding(false);
    }
  }

  const cover = resolveUploadUrl(course?.cover_url) ?? course?.cover_url ?? null;
  const summary = courseShortSummary(course?.description);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <BackButton href="/courses" />
        <PageHeader
          eyebrow="Learning"
          title={course?.title ?? "Course summary"}
          description="Review this program, then buy it or add it to your cart."
        />
      </div>

      {error ? (
        <div className="rounded-none border border-caisbe-red/30 bg-caisbe-red/5 px-4 py-3 text-sm text-caisbe-red">
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

      {loading ? (
        <p className="border border-ifma-border bg-admin-surface px-5 py-6 text-sm text-caisbe-muted shadow-brand-card">
          Loading course…
        </p>
      ) : course ? (
        <section className="space-y-6 border border-ifma-border bg-admin-surface p-5 shadow-brand-card md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-start">
            <span className="relative h-48 w-full shrink-0 overflow-hidden rounded-md border border-ifma-border bg-[#fafaf8] sm:h-40 sm:w-64">
              {cover ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={cover} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-sm font-semibold uppercase tracking-wide text-caisbe-red">
                  {course.code.slice(0, 4)}
                </span>
              )}
            </span>
            <div className="min-w-0 flex-1 space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                {course.code}
              </p>
              <h2 className="font-display text-2xl font-semibold text-caisbe-text-dark">
                {course.title}
              </h2>
              <p className="text-sm leading-7 text-caisbe-muted">{summary}</p>
              <p className="text-base font-semibold text-caisbe-text-dark">
                {formatMoney(course.price_cents ?? 0, course.currency)}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href={`/courses/${course.id}/checkout`}
              className="inline-flex h-11 items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase text-white transition hover:bg-caisbe-red-dark"
            >
              Buy now · {formatMoney(course.price_cents ?? 0, course.currency)}
            </Link>
            {inCart ? (
              <Link
                href="/cart"
                className="inline-flex h-11 items-center justify-center rounded-md border-2 border-caisbe-red bg-admin-surface px-5 text-sm font-semibold uppercase text-caisbe-red transition hover:bg-caisbe-red hover:text-white"
              >
                In cart · View
              </Link>
            ) : (
              <button
                type="button"
                disabled={adding}
                onClick={() => void addToCart()}
                className="inline-flex h-11 items-center justify-center rounded-md border-2 border-caisbe-red bg-admin-surface px-5 text-sm font-semibold uppercase text-caisbe-red transition hover:bg-caisbe-red hover:text-white disabled:opacity-60"
              >
                {adding ? "Adding…" : "Add to cart"}
              </button>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
