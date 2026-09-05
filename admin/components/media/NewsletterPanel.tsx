"use client";

import { useState } from "react";
import {
  apiFetch,
  ApiError,
  type NewsletterCampaign,
  type NewsletterSubscriber,
} from "@/lib/auth";

export default function NewsletterPanel({
  subscribers,
  campaigns,
  loading,
  onRefresh,
  onError,
  onSuccess,
}: {
  subscribers: NewsletterSubscriber[];
  campaigns: NewsletterCampaign[];
  loading: boolean;
  onRefresh: () => Promise<void>;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
}) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function sendNewsletter() {
    if (!subject.trim()) {
      onError("Subject is required.");
      return;
    }
    if (!bodyHtml.trim()) {
      onError("Message body is required.");
      return;
    }
    setSending(true);
    try {
      const result = await apiFetch<{ message: string }>("/admin/newsletter/send", {
        method: "POST",
        body: JSON.stringify({
          subject: subject.trim(),
          body_html: bodyHtml.trim(),
          test_email: testEmail.trim() || null,
        }),
      });
      setSubject("");
      setBodyHtml("");
      setTestEmail("");
      onSuccess(result.message);
      await onRefresh();
    } catch (err) {
      onError(err instanceof ApiError ? err.detail : "Unable to send newsletter.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="border border-ifma-border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            Active subscribers
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
            {loading ? "—" : subscribers.length}
          </p>
        </div>
        <div className="border border-ifma-border bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
            Campaigns sent
          </p>
          <p className="mt-2 font-display text-3xl font-semibold text-caisbe-text-dark">
            {loading ? "—" : campaigns.length}
          </p>
        </div>
      </div>

      <section className="border border-ifma-border bg-white p-6">
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Send newsletter</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Emails are sent to all active subscribers from the database. Use a test address first.
        </p>

        <div className="mt-6 space-y-4">
          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="h-11 w-full rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-green"
              placeholder="CAISBE Newsletter — March 2026"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Message (HTML supported)
            </span>
            <textarea
              value={bodyHtml}
              onChange={(e) => setBodyHtml(e.target.value)}
              rows={10}
              className="w-full rounded-md border border-ifma-border bg-white px-3 py-2 font-mono text-sm outline-none focus:border-caisbe-green"
              placeholder="<p>Hello from CAISBE…</p>"
            />
          </label>

          <label className="block space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Test email (optional)
            </span>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              className="h-11 w-full max-w-md rounded-md border border-ifma-border bg-white px-3 text-sm outline-none focus:border-caisbe-green"
              placeholder="you@example.com"
            />
            <p className="text-xs text-caisbe-muted">
              When set, only this address receives the email instead of all subscribers.
            </p>
          </label>
        </div>

        <button
          type="button"
          disabled={sending}
          onClick={() => void sendNewsletter()}
          className="mt-6 inline-flex items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-5 py-3 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-green-mid disabled:opacity-60"
        >
          {sending ? "Sending…" : testEmail.trim() ? "Send test email" : "Send to all subscribers"}
        </button>
      </section>

      <section className="overflow-x-auto border border-ifma-border bg-white">
        <div className="border-b border-ifma-border-light px-6 py-4">
          <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Subscribers</h2>
        </div>
        {loading ? (
          <p className="p-6 text-sm text-caisbe-muted">Loading…</p>
        ) : subscribers.length === 0 ? (
          <p className="p-6 text-sm text-caisbe-muted">
            No subscribers yet. They are added when visitors sign up on the website.
          </p>
        ) : (
          <table className="min-w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-[#fafaf8]">
              <tr>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Email</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Name</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Subscribed</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {subscribers.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 text-caisbe-text">{row.email}</td>
                  <td className="px-6 py-4 text-caisbe-muted">{row.full_name ?? "—"}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-caisbe-muted">
                    {new Date(row.subscribed_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {campaigns.length > 0 ? (
        <section className="overflow-x-auto border border-ifma-border bg-white">
          <div className="border-b border-ifma-border-light px-6 py-4">
            <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Recent campaigns</h2>
          </div>
          <table className="min-w-full divide-y divide-ifma-border-light text-left text-sm">
            <thead className="bg-[#fafaf8]">
              <tr>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Subject</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Recipients</th>
                <th className="px-6 py-3 font-semibold text-caisbe-text">Sent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ifma-border-light">
              {campaigns.map((row) => (
                <tr key={row.id}>
                  <td className="px-6 py-4 font-medium text-caisbe-text">{row.subject}</td>
                  <td className="px-6 py-4 tabular-nums text-caisbe-muted">{row.recipient_count}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-caisbe-muted">
                    {new Date(row.sent_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : null}
    </div>
  );
}
