"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/auth";

const inputClass =
  "h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-green focus:ring-1 focus:ring-caisbe-green";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        router.replace("/login");
        return;
      }
      router.replace("/my-account");
    }
  }, [loading, user, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const created = await register({
        full_name: fullName,
        email,
        phone,
        country,
        city,
        password,
      });
      if (created.role === "admin") {
        router.replace("/login");
        return;
      }
      router.push("/my-account");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to register. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-sm text-caisbe-muted">
        Loading…
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-3xl font-semibold text-caisbe-green">Student registration</h1>
      <p className="mt-2 text-sm text-caisbe-muted">
        Create your CAISBE student account to enroll in certificate programs.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4">
        <div>
          <label htmlFor="register-name" className="mb-1 block text-sm font-medium text-caisbe-text">
            Full name
          </label>
          <input
            id="register-name"
            type="text"
            required
            minLength={2}
            autoComplete="name"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="register-email" className="mb-1 block text-sm font-medium text-caisbe-text">
            Email
          </label>
          <input
            id="register-email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <label htmlFor="register-phone" className="mb-1 block text-sm font-medium text-caisbe-text">
            Phone number
          </label>
          <input
            id="register-phone"
            type="tel"
            required
            minLength={5}
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
            placeholder="+1 403 555 0100"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="register-country" className="mb-1 block text-sm font-medium text-caisbe-text">
              Country
            </label>
            <input
              id="register-country"
              type="text"
              required
              minLength={2}
              autoComplete="country-name"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label htmlFor="register-city" className="mb-1 block text-sm font-medium text-caisbe-text">
              City
            </label>
            <input
              id="register-city"
              type="text"
              required
              minLength={2}
              autoComplete="address-level2"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label htmlFor="register-password" className="mb-1 block text-sm font-medium text-caisbe-text">
            Password
          </label>
          <input
            id="register-password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-caisbe-muted">At least 8 characters.</p>
        </div>

        {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-w-[180px] items-center justify-center rounded-md border-2 border-caisbe-green bg-caisbe-green px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-green-mid disabled:opacity-60"
        >
          {submitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-sm text-caisbe-muted">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-caisbe-red hover:text-caisbe-red-dark">
          Login
        </Link>
      </p>
    </section>
  );
}
