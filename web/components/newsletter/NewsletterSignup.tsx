"use client";

import { FormEvent, useState } from "react";
import { subscribeNewsletter } from "@/lib/api";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type NewsletterLabels = {
  emailLabel: string;
  emailTitle: string;
  placeholder: string;
  subscribe: string;
  subscribing: string;
  invalidEmail: string;
  errorFallback: string;
};

type NewsletterSignupProps = {
  className?: string;
  compact?: boolean;
  tone?: "light" | "dark";
  labels?: NewsletterLabels;
};

export default function NewsletterSignup({
  className = "",
  compact = false,
  tone = "light",
  labels,
}: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const isDark = tone === "dark";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_PATTERN.test(trimmed)) {
      setStatus("error");
      setMessage(labels?.invalidEmail ?? "Enter a valid email address.");
      return;
    }
    setStatus("loading");
    setMessage(null);
    try {
      const result = await subscribeNewsletter({
        email: trimmed,
      });
      setStatus("success");
      setMessage(result.message);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : (labels?.errorFallback ?? "Unable to subscribe."));
    }
  }

  return (
    <div className={className}>
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className={compact ? "flex flex-col gap-3 sm:flex-row sm:items-end" : "space-y-4"}
      >
        <label className={compact ? "min-w-0 flex-1 space-y-2" : "block space-y-2"}>
          {!compact ? (
            <span
              className={`text-base font-semibold ${isDark ? "text-white" : "text-ifma-navy"}`}
            >
              {labels?.emailLabel ?? "Email"}
            </span>
          ) : null}
          <input
            type="email"
            name="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
            title={labels?.emailTitle ?? "Enter a valid email address"}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`h-11 w-full rounded-md border bg-white px-3 text-base text-ifma-navy outline-none placeholder:text-ifma-navy/45 focus:border-caisbe-red ${
              isDark ? "border-white/25" : "border-ifma-border-light"
            }`}
            placeholder={labels?.placeholder ?? "name@example.com"}
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className={
            compact
              ? "inline-flex h-11 shrink-0 items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 text-base font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red/90 disabled:opacity-60"
              : "inline-flex w-full items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-base font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red/90 disabled:opacity-60"
          }
        >
          {status === "loading"
            ? (labels?.subscribing ?? "Subscribing…")
            : (labels?.subscribe ?? "Subscribe")}
        </button>
      </form>
      {message ? (
        <p
          className={`mt-3 text-base ${
            status === "error"
              ? "text-caisbe-red"
              : isDark
                ? "text-white"
                : "text-caisbe-green"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
