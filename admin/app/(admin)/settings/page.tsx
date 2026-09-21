"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";

type AppSettings = {
  institute_name: string;
  default_pass_percent: number;
  membership_cert_title: string;
  completion_cert_title: string;
  portal_public_url: string;
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [passwordMessage, setPasswordMessage] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<AppSettings>("/admin/settings");
        if (active) setSettings(data);
      } catch (err) {
        if (active) setError(err instanceof ApiError ? err.detail : "Unable to load settings.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await apiFetch<AppSettings>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify({
          institute_name: settings.institute_name,
          default_pass_percent: settings.default_pass_percent,
          membership_cert_title: settings.membership_cert_title,
          completion_cert_title: settings.completion_cert_title,
        }),
      });
      setSettings(updated);
      setMessage("Settings saved.");
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(event: FormEvent) {
    event.preventDefault();
    setPasswordError(null);
    setPasswordMessage(null);
    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }
    setPasswordBusy(true);
    try {
      await apiFetch("/admin/change-password", {
        method: "POST",
        body: JSON.stringify({
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Password updated.");
    } catch (err) {
      setPasswordError(err instanceof ApiError ? err.detail : "Unable to change password.");
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">Settings</h1>
        <p className="mt-2 text-sm text-caisbe-muted">
          Configure certificate branding, LMS defaults, and your admin password.
        </p>
      </div>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {message ? <p className="text-sm text-caisbe-green">{message}</p> : null}

      <section className="border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Certificate & LMS defaults</h2>
        {loading || !settings ? (
          <p className="mt-4 text-sm text-caisbe-muted">Loading…</p>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="mt-4 space-y-4">
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Institute name (certificate footer)
              </span>
              <input
                value={settings.institute_name}
                onChange={(e) => setSettings({ ...settings, institute_name: e.target.value })}
                className="w-full border border-ifma-border px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Default pass percent (new courses)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.default_pass_percent}
                onChange={(e) =>
                  setSettings({ ...settings, default_pass_percent: Number(e.target.value) })
                }
                className="w-full max-w-xs border border-ifma-border px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Membership certificate title
              </span>
              <input
                value={settings.membership_cert_title}
                onChange={(e) =>
                  setSettings({ ...settings, membership_cert_title: e.target.value })
                }
                className="w-full border border-ifma-border px-3 py-2 text-sm"
                required
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
                Completion certificate title
              </span>
              <input
                value={settings.completion_cert_title}
                onChange={(e) =>
                  setSettings({ ...settings, completion_cert_title: e.target.value })
                }
                className="w-full border border-ifma-border px-3 py-2 text-sm"
                required
              />
            </label>
            <div className="rounded-md border border-ifma-border-light bg-[#fafafa] px-3 py-2 text-sm text-caisbe-muted">
              Portal public URL (read-only):{" "}
              <span className="font-mono text-caisbe-text">{settings.portal_public_url}</span>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-md border-2 border-caisbe-green bg-caisbe-green px-5 py-2.5 text-sm font-semibold uppercase text-white hover:bg-caisbe-green-mid disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </form>
        )}
      </section>

      <section className="border border-ifma-border bg-white p-6">
        <h2 className="text-lg font-semibold text-caisbe-text">Change password</h2>
        {passwordError ? <p className="mt-3 text-sm text-caisbe-red">{passwordError}</p> : null}
        {passwordMessage ? <p className="mt-3 text-sm text-caisbe-green">{passwordMessage}</p> : null}
        <form onSubmit={(e) => void handlePassword(e)} className="mt-4 max-w-md space-y-4">
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Current password
            </span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-ifma-border px-3 py-2 text-sm"
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              New password
            </span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-ifma-border px-3 py-2 text-sm"
              minLength={8}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
              Confirm new password
            </span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-ifma-border px-3 py-2 text-sm"
              minLength={8}
              required
            />
          </label>
          <button
            type="submit"
            disabled={passwordBusy}
            className="rounded-md border-2 border-ifma-border bg-white px-5 py-2.5 text-sm font-semibold uppercase text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green disabled:opacity-60"
          >
            {passwordBusy ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    </div>
  );
}
