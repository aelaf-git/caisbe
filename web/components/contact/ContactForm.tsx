"use client";

import { FormEvent, useState } from "react";
import { apiFetch } from "@/lib/api";

type ContactFormProps = {
  cta: string;
  heading?: string;
};

const inputClass =
  "h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-red focus:ring-1 focus:ring-caisbe-red";

export default function ContactForm({ cta, heading }: ContactFormProps) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setSubmitting(true);

    const form = event.currentTarget;
    const data = new FormData(form);
    const payload = {
      first_name: String(data.get("firstName") || "").trim(),
      last_name: String(data.get("lastName") || "").trim(),
      company: String(data.get("company") || "").trim() || null,
      job_title: String(data.get("jobTitle") || "").trim() || null,
      phone: String(data.get("phone") || "").trim() || null,
      email: String(data.get("email") || "").trim(),
      help_topic: String(data.get("help") || "").trim() || null,
      comments: String(data.get("comments") || "").trim(),
    };

    try {
      await apiFetch("/contact", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      form.reset();
      setSuccess("Thank you. Your message has been sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {heading ? (
        <h3 className="font-hopewell-display text-xl font-extrabold text-caisbe-text-dark">
          {heading}
        </h3>
      ) : null}

      {error ? (
        <p className="rounded-md border border-caisbe-red/20 bg-caisbe-red/5 px-3 py-2 text-sm text-caisbe-red">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="rounded-md border border-[#177245]/20 bg-[#e9f7ef] px-3 py-2 text-sm text-[#177245]">
          {success}
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="contact-first-name" className="mb-1 block text-sm font-medium text-caisbe-text">
            First Name
          </label>
          <input id="contact-first-name" name="firstName" type="text" required className={inputClass} />
        </div>
        <div>
          <label htmlFor="contact-last-name" className="mb-1 block text-sm font-medium text-caisbe-text">
            Last Name
          </label>
          <input id="contact-last-name" name="lastName" type="text" required className={inputClass} />
        </div>
      </div>

      <div>
        <label htmlFor="contact-company" className="mb-1 block text-sm font-medium text-caisbe-text">
          Company
        </label>
        <input id="contact-company" name="company" type="text" className={inputClass} />
      </div>

      <div>
        <label htmlFor="contact-job-title" className="mb-1 block text-sm font-medium text-caisbe-text">
          Job Title
        </label>
        <input id="contact-job-title" name="jobTitle" type="text" className={inputClass} />
      </div>

      <div>
        <label htmlFor="contact-phone" className="mb-1 block text-sm font-medium text-caisbe-text">
          Phone
        </label>
        <input id="contact-phone" name="phone" type="tel" className={inputClass} />
      </div>

      <div>
        <label htmlFor="contact-email" className="mb-1 block text-sm font-medium text-caisbe-text">
          Email
        </label>
        <input id="contact-email" name="email" type="email" required className={inputClass} />
      </div>

      <div>
        <label htmlFor="contact-help" className="mb-1 block text-sm font-medium text-caisbe-text">
          How can we help?
        </label>
        <input id="contact-help" name="help" type="text" className={inputClass} />
      </div>

      <div>
        <label htmlFor="contact-comments" className="mb-1 block text-sm font-medium text-caisbe-text">
          Comments
        </label>
        <textarea
          id="contact-comments"
          name="comments"
          rows={5}
          required
          className="w-full resize-y rounded-md border border-ifma-border bg-white px-4 py-3 text-sm text-caisbe-text outline-none focus:border-caisbe-red focus:ring-1 focus:ring-caisbe-red"
        />
      </div>

      <div className="pt-2 text-center">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex min-w-[180px] items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-red-dark disabled:opacity-60"
        >
          {submitting ? "Sending…" : cta}
        </button>
      </div>
    </form>
  );
}
