"use client";

import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import PasswordCriteriaList from "@/components/ui/PasswordCriteriaList";
import { apiFetch, ApiError } from "@/lib/auth";
import { passwordStrengthError } from "@/lib/password";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = (searchParams.get("token") || "").trim();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(
    token ? null : "This password reset link is missing or incomplete.",
  );
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) {
      setError("This password reset link is missing or incomplete.");
      return;
    }
    const strength = passwordStrengthError(password, confirmPassword);
    if (strength) {
      setError(strength);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await apiFetch<{ message: string }>("/auth/reset-password", {
        method: "POST",
        auth: false,
        body: JSON.stringify({ token, new_password: password }),
      });
      setDone(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.detail
          : "This password reset link is invalid or has expired.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="flex min-h-screen flex-1 items-center justify-center bg-admin-canvas px-4 py-10">
      <div className="w-full max-w-md rounded-[20px] border border-ifma-border bg-admin-surface p-6 shadow-hopewell sm:p-8">
        <Image
          src="/images/logo.png"
          alt="CAISBE logo"
          width={2172}
          height={724}
          priority
          className="h-16 w-auto object-contain sm:h-20"
        />
        <h1 className="font-hopewell-display mt-6 text-2xl font-extrabold tracking-tight text-caisbe-text-dark">
          Reset password
        </h1>

        {done ? (
          <div className="mt-6 space-y-4">
            <p className="text-sm leading-6 text-caisbe-muted">
              Your password has been updated. You can sign in with your new password.
            </p>
            <Link
              href="/login"
              className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-caisbe-red px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-caisbe-red-dark"
            >
              Go to login
            </Link>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm leading-6 text-caisbe-muted">
              Choose a new password for your myCAISBE account.
            </p>
            <form onSubmit={handleSubmit} className="mt-8 space-y-4">
              <div>
                <label htmlFor="reset-password" className="mb-1 block text-sm font-medium text-caisbe-text">
                  New password
                </label>
                <input
                  id="reset-password"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={!token}
                  className="h-12 w-full rounded-full border border-ifma-border bg-admin-surface-muted px-4 text-sm text-caisbe-text outline-none placeholder:text-caisbe-muted/70 focus:border-caisbe-red disabled:opacity-60"
                />
                <PasswordCriteriaList password={password} className="mt-2" />
              </div>
              <div>
                <label htmlFor="reset-confirm" className="mb-1 block text-sm font-medium text-caisbe-text">
                  Confirm password
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={!token}
                  className="h-12 w-full rounded-full border border-ifma-border bg-admin-surface-muted px-4 text-sm text-caisbe-text outline-none placeholder:text-caisbe-muted/70 focus:border-caisbe-red disabled:opacity-60"
                />
              </div>
              {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
              <button
                type="submit"
                disabled={submitting || !token}
                className="inline-flex min-w-[180px] items-center justify-center rounded-full bg-caisbe-red px-8 py-3 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-caisbe-red-dark disabled:opacity-60"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>
            </form>
            <p className="mt-6 flex flex-wrap gap-x-4 gap-y-2 text-sm text-caisbe-muted">
              <Link href="/forgot-password" className="font-semibold text-caisbe-red hover:text-caisbe-red-dark">
                Request a new link
              </Link>
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

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
          Loading…
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
