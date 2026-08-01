"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError, clearToken } from "@/lib/auth";

const ADMIN_URL = process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export default function PortalLoginPage() {
  const router = useRouter();
  const { user, loading, login, logout } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && user.role !== "admin") {
      router.replace("/my-account");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const loggedIn = await login(email, password);
      if (loggedIn.role === "admin") {
        logout();
        clearToken();
        setError("Administrators should use the Admin portal.");
        return;
      }
      router.push("/my-account");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || (user && user.role !== "admin")) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-caisbe-muted">
        Loading…
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-md px-4 py-12">
      <h1 className="font-display text-3xl font-semibold text-caisbe-green">Student login</h1>
      <p className="mt-2 text-sm text-caisbe-muted">
        Access your enrolled CAISBE courses and certificates.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="login-email" className="mb-1 block text-sm font-medium text-caisbe-text">
            Email
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-green focus:ring-1 focus:ring-caisbe-green"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="mb-1 block text-sm font-medium text-caisbe-text">
            Password
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-green focus:ring-1 focus:ring-caisbe-green"
          />
        </div>

        {error ? (
          <p className="text-sm text-caisbe-red">
            {error}{" "}
            {error.includes("Admin") ? (
              <a href={ADMIN_URL} className="font-semibold underline">
                Open Admin
              </a>
            ) : null}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-w-[180px] items-center justify-center rounded-md border-2 border-caisbe-green bg-caisbe-green px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-green-mid disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-sm text-caisbe-muted">
        New to CAISBE?{" "}
        <Link href="/register" className="font-semibold text-caisbe-red hover:text-caisbe-red-dark">
          Register
        </Link>
      </p>
    </section>
  );
}
