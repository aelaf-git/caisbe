"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import Alert from "@/components/ui/Alert";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormField, { fieldClassName } from "@/components/ui/FormField";
import PageHeader from "@/components/ui/PageHeader";
import Skeleton from "@/components/ui/Skeleton";

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
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Configure certificate branding, LMS defaults, and your admin password."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Certificate &amp; LMS defaults</h2>
        <p className="mt-1 text-sm text-caisbe-muted">Defaults used for new courses and generated credentials.</p>
        {loading || !settings ? (
          <div className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Loading settings">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16" />)}
          </div>
        ) : (
          <form onSubmit={(e) => void handleSave(e)} className="mt-6 grid gap-5 md:grid-cols-2">
            <FormField label="Institute name" hint="Shown in the certificate footer.">
              <input
                value={settings.institute_name}
                onChange={(e) => setSettings({ ...settings, institute_name: e.target.value })}
                className={fieldClassName}
                required
              />
            </FormField>
            <FormField label="Default pass percent" hint="Applied when creating a course.">
              <input
                type="number"
                min={0}
                max={100}
                value={settings.default_pass_percent}
                onChange={(e) =>
                  setSettings({ ...settings, default_pass_percent: Number(e.target.value) })
                }
                className={fieldClassName}
                required
              />
            </FormField>
            <FormField label="Membership certificate title">
              <input
                value={settings.membership_cert_title}
                onChange={(e) =>
                  setSettings({ ...settings, membership_cert_title: e.target.value })
                }
                className={fieldClassName}
                required
              />
            </FormField>
            <FormField label="Completion certificate title">
              <input
                value={settings.completion_cert_title}
                onChange={(e) =>
                  setSettings({ ...settings, completion_cert_title: e.target.value })
                }
                className={fieldClassName}
                required
              />
            </FormField>
            <div className="rounded-lg border border-ifma-border-light bg-admin-surface-muted px-4 py-3 text-sm text-caisbe-muted md:col-span-2">
              Portal public URL (read-only):{" "}
              <span className="break-all font-mono text-caisbe-text">{settings.portal_public_url}</span>
            </div>
            <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
            </div>
          </form>
        )}
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Change password</h2>
        <p className="mt-1 text-sm text-caisbe-muted">Use at least eight characters for your new password.</p>
        <div className="mt-4 space-y-3">
        {passwordError ? <Alert tone="error">{passwordError}</Alert> : null}
        {passwordMessage ? <Alert tone="success">{passwordMessage}</Alert> : null}
        </div>
        <form onSubmit={(e) => void handlePassword(e)} className="mt-6 max-w-md space-y-5">
          <FormField label="Current password">
            <input
              autoComplete="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className={fieldClassName}
              required
            />
          </FormField>
          <FormField label="New password">
            <input
              autoComplete="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={fieldClassName}
              minLength={8}
              required
            />
          </FormField>
          <FormField label="Confirm new password">
            <input
              autoComplete="new-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={fieldClassName}
              minLength={8}
              required
            />
          </FormField>
          <Button type="submit" disabled={passwordBusy} variant="secondary">
            {passwordBusy ? "Updating…" : "Update password"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
