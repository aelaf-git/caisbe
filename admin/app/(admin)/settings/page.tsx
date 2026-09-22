"use client";

import { FormEvent, useEffect, useState } from "react";
import { apiFetch, ApiError } from "@/lib/auth";
import {
  applyAppearance,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  markAppearanceAdjusted,
  THEME_OPTIONS,
  writeStoredAppearance,
  type FontId,
  type FontSizeId,
  type ThemeId,
} from "@/lib/appearance";
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
  ui_theme: ThemeId;
  ui_font_size: FontSizeId;
  ui_font_body: FontId;
  ui_font_display: FontId;
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
          ui_theme: settings.ui_theme,
          ui_font_size: settings.ui_font_size,
          ui_font_body: settings.ui_font_body,
          ui_font_display: settings.ui_font_display,
        }),
      });
      setSettings(updated);
      writeStoredAppearance({
        theme: updated.ui_theme,
        fontSize: updated.ui_font_size,
        fontBody: updated.ui_font_body,
        fontDisplay: updated.ui_font_display,
      });
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

  function updateAppearance(patch: Partial<Pick<AppSettings, "ui_theme" | "ui_font_size" | "ui_font_body" | "ui_font_display">>) {
    if (!settings) return;
    const next = { ...settings, ...patch };
    setSettings(next);
    markAppearanceAdjusted();
    applyAppearance({
      theme: next.ui_theme,
      fontSize: next.ui_font_size,
      fontBody: next.ui_font_body,
      fontDisplay: next.ui_font_display,
    });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Administration"
        title="Settings"
        description="Configure certificate branding, the admin console look, and your admin password."
      />

      {error ? <Alert tone="error">{error}</Alert> : null}
      {message ? <Alert tone="success">{message}</Alert> : null}

      {loading || !settings ? (
        <>
      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Certificate &amp; LMS defaults</h2>
        <p className="mt-1 text-sm text-caisbe-muted">Defaults used for new courses and generated credentials.</p>
          <div className="mt-6 grid gap-4 md:grid-cols-2" aria-label="Loading settings">
            {[0, 1, 2, 3].map((item) => <Skeleton key={item} className="h-16" />)}
          </div>
      </Card>
      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Appearance</h2>
        <div className="mt-6 grid gap-4" aria-label="Loading appearance">
          {[0, 1, 2].map((item) => <Skeleton key={item} className="h-16" />)}
        </div>
      </Card>
        </>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="space-y-6">
      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Certificate &amp; LMS defaults</h2>
        <p className="mt-1 text-sm text-caisbe-muted">Defaults used for new courses and generated credentials.</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2">
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
          </div>
      </Card>

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Appearance</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Font size, type, and theme apply to this admin console as you change them. Save to keep them for the next visit.
        </p>
          <div className="mt-6 space-y-6">
            <fieldset>
              <legend className="text-sm font-semibold text-caisbe-text">Theme</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {THEME_OPTIONS.map((option) => {
                  const selected = settings.ui_theme === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateAppearance({ ui_theme: option.id })}
                      className={`h-10 rounded-md border-2 px-4 text-sm font-semibold ${
                        selected
                          ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
                          : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-caisbe-text">Font size</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FONT_SIZE_OPTIONS.map((option) => {
                  const selected = settings.ui_font_size === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateAppearance({ ui_font_size: option.id })}
                      className={`h-10 rounded-md border-2 px-4 text-sm font-semibold ${
                        selected
                          ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
                          : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-caisbe-text">Body font</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FONT_OPTIONS.map((option) => {
                  const selected = settings.ui_font_body === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateAppearance({ ui_font_body: option.id })}
                      style={{ fontFamily: `var(${option.variable})` }}
                      className={`h-10 rounded-md border-2 px-4 text-sm ${
                        selected
                          ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
                          : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-semibold text-caisbe-text">Heading font</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {FONT_OPTIONS.map((option) => {
                  const selected = settings.ui_font_display === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => updateAppearance({ ui_font_display: option.id })}
                      style={{ fontFamily: `var(${option.variable})` }}
                      className={`h-10 rounded-md border-2 px-4 text-sm ${
                        selected
                          ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
                          : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <div className="rounded-lg border border-ifma-border bg-admin-canvas px-4 py-4">
              <p className="font-display text-2xl font-semibold text-caisbe-text-dark">Heading preview</p>
              <p className="mt-2 text-base text-caisbe-text">
                Body text uses the selected font and size across the admin console.
              </p>
              <p className="mt-1 text-sm text-caisbe-muted">Secondary text stays readable in light and dark themes.</p>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
      </Card>
        </form>
      )}

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
