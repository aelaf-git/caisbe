"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import { ApiError } from "@/lib/auth";

const inputClass =
  "h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-red";

export default function RegisterPage() {
  const router = useRouter();
  const { user, loading, register } = useAuth();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      if (user.role === "admin") {
        router.replace("/login");
        return;
      }
      router.replace("/dashboard");
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
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to register. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading || user) {
    return (
      <div className="flex min-h-screen flex-1 items-center justify-center px-4 py-16 text-sm text-caisbe-muted">
        Loading…
      </div>
    );
  }

  return (
    <section className="grid min-h-screen flex-1 lg:grid-cols-2">
      <div className="relative min-h-[220px] overflow-hidden sm:min-h-[280px] lg:min-h-screen">
        <Image
          src="/images/student_register.jpeg"
          alt="Students collaborating around a study table"
          fill
          priority
          sizes="(min-width: 1024px) 50vw, 100vw"
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-linear-to-t from-black/75 via-caisbe-red/20 to-black/10 lg:bg-linear-to-r lg:from-black/20 lg:via-transparent lg:to-caisbe-red/35" />
        <div className="absolute inset-x-0 bottom-0 p-6 sm:p-10 lg:p-12">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">CAISBE Students</p>
          <p className="mt-2 max-w-md font-display text-2xl font-semibold text-white sm:text-3xl">
            Join CAISBE and start your professional learning path
          </p>
        </div>
      </div>

      <div className="flex flex-col justify-center overflow-y-auto bg-[#f7f7f5] px-4 py-10 sm:px-10 lg:max-h-screen lg:px-16">
        <div className="mx-auto w-full max-w-md">
          <Image
            src="/images/logo.png"
            alt="CAISBE logo"
            width={2172}
            height={724}
            priority
            className="h-20 w-auto object-contain sm:h-24"
          />
          <h1 className="mt-6 font-display text-2xl font-semibold text-caisbe-text-dark">Student registration</h1>
          <p className="mt-2 text-sm text-caisbe-muted">
            Create your CAISBE student account to enroll in certificate programs.
          </p>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            <div>
              <label htmlFor="register-name" className="mb-1 block text-sm font-medium">
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
              <label htmlFor="register-email" className="mb-1 block text-sm font-medium">
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
              <label htmlFor="register-phone" className="mb-1 block text-sm font-medium">
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
                <label htmlFor="register-country" className="mb-1 block text-sm font-medium">
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
                <label htmlFor="register-city" className="mb-1 block text-sm font-medium">
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
              <label htmlFor="register-password" className="mb-1 block text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <input
                  id="register-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((open) => !open)}
                  className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-caisbe-muted transition-colors hover:text-caisbe-red"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                      <path d="M1 1l22 22" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-caisbe-muted">At least 8 characters.</p>
            </div>

            {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-w-[180px] items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-caisbe-red-dark hover:bg-caisbe-red-dark disabled:opacity-60"
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
        </div>
      </div>
    </section>
  );
}
