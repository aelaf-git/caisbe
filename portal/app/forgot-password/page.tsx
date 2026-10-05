"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(() => (searchParams.get("email") || "").trim());
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<{ message: string }>("/auth/forgot-password", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ email }),
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to send reset instructions. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-screen flex-1 items-center justify-center bg-admin-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-[20px] bg-white p-6 shadow-hopewell sm:p-8">
        <Image
          src="/images/logo.png"
          alt="CAISBE logo"
          width={2172}
          height={724}
          priority
          className="h-16 w-auto object-contain sm:h-20"
        />
        <h1 className="font-hopewell-display mt-6 text-2xl font-extrabold tracking-tight text-caisbe-text-dark">
          Forgot password
        </h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-caisbe-muted">
              If an account exists for that email, we sent instructions to continue. Check your inbox
              for a password reset link (or a verification link if you still need to open your account).
            </p>
            <p className="text-sm text-caisbe-muted">
              <Link href="/login" className="font-semibold text-caisbe-red hover:text-caisbe-red-dark">
                Back to login
              </Link>
            </p>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-caisbe-muted">
              Enter the email you use for the student portal. We will send a link to set a new password.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="forgot-email" className="mb-1 block text-sm font-medium">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 w-full rounded-full border border-ifma-border bg-admin-surface px-4 text-sm outline-none focus:border-caisbe-red"
                />
              </div>
              {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-caisbe-red px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-caisbe-red-dark disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send reset link"}
              </button>
            </form>
            <p className="mt-6 text-sm text-caisbe-muted">
              Remembered it?{" "}
              <Link href="/login" className="font-semibold text-caisbe-red hover:text-caisbe-red-dark">
                Login
              </Link>
            </p>
          </>
        )}
      </div>
    </section>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
          Loading…
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
