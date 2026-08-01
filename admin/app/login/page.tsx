"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, clearToken } from "@/lib/auth";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function AdminLoginPage() {
  const router = useRouter();
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user?.role === "admin") {
      router.replace("/courses");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      if (loggedIn.role !== "admin") {
        logout();
        clearToken();
        setError("This portal is for administrators only. Students should use the student portal.");
        return;
      }
      router.replace("/courses");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to log in.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user?.role === "admin") {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
        Loading…
      </div>
    );
  }

  return (
    <section className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">CAISBE Admin</p>
      <h1 className="mt-2 font-display text-3xl font-semibold text-caisbe-green">Admin login</h1>
      <p className="mt-2 text-sm text-caisbe-muted">
        Manage courses, chapters, and published learning content. This is not the student portal.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="admin-email" className="mb-1 block text-sm font-medium">
            Email
          </label>
          <input
            id="admin-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm outline-none focus:border-caisbe-green"
          />
        </div>
        <div>
          <label htmlFor="admin-password" className="mb-1 block text-sm font-medium">
            Password
          </label>
          <input
            id="admin-password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm outline-none focus:border-caisbe-green"
          />
        </div>
        {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-w-[180px] items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <a href={SITE_URL} className="mt-8 text-sm text-caisbe-muted hover:text-caisbe-green">
        ← Back to CAISBE website
      </a>
    </section>
  );
}
