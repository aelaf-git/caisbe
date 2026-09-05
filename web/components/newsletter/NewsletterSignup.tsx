"use client";

import { FormEvent, useState } from "react";
import { subscribeNewsletter } from "@/lib/api";

type NewsletterSignupProps = {
  className?: string;
  compact?: boolean;
};

export default function NewsletterSignup({ className = "", compact = false }: NewsletterSignupProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage(null);
    try {
      const result = await subscribeNewsletter({
        email: email.trim(),
      });
      setStatus("success");
      setMessage(result.message);
      setEmail("");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Unable to subscribe.");
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
            <span className="text-sm font-semibold text-ifma-navy">Email</span>
          ) : null}
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-md border border-ifma-border-light bg-white px-3 text-sm outline-none focus:border-caisbe-red"
            placeholder="Email address"
          />
        </label>
        <button
          type="submit"
          disabled={status === "loading"}
          className={
            compact
              ? "inline-flex h-11 shrink-0 items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red/90 disabled:opacity-60"
              : "inline-flex w-full items-center justify-center border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red/90 disabled:opacity-60"
          }
        >
          {status === "loading" ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
      {message ? (
        <p
          className={`mt-3 text-sm ${
            status === "error" ? "text-caisbe-red" : "text-caisbe-green"
          }`}
        >
          {message}
        </p>
      ) : null}
    </div>
  );
}
