"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { PageHeader } from "@/components/ui/PageHeader";
import { SaveButton } from "@/components/ui/SaveButton";
import { useNoticeDialog } from "@/components/ui/useNoticeDialog";
import { apiFetch } from "@/lib/api";
import { fieldClassName } from "@/lib/formStyles";

type AdminMe = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type AdminSettings = {
  siteName: string;
  supportEmail: string;
  timezone: string;
  maintenanceMode: boolean;
};

const EMPTY_SETTINGS: AdminSettings = {
  siteName: "",
  supportEmail: "",
  timezone: "UTC",
  maintenanceMode: false,
};

export default function SettingsPage() {
  const { notice, dialog } = useNoticeDialog();
  const [me, setMe] = useState<AdminMe | null>(null);
  const [settings, setSettings] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [baseline, setBaseline] = useState<AdminSettings>(EMPTY_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const [meRes, settingsRes] = await Promise.all([
          apiFetch<AdminMe>("/admin/auth/me"),
          apiFetch<AdminSettings>("/admin/settings"),
        ]);
        if (cancelled) return;
        setMe(meRes);
        setSettings(settingsRes);
        setBaseline(settingsRes);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : "Unable to load settings");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const dirty =
    settings.siteName !== baseline.siteName ||
    settings.supportEmail !== baseline.supportEmail ||
    settings.timezone !== baseline.timezone ||
    settings.maintenanceMode !== baseline.maintenanceMode;

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const updated = await apiFetch<AdminSettings>("/admin/settings", {
        method: "PUT",
        body: JSON.stringify(settings),
      });
      setSettings(updated);
      setBaseline(updated);
      await notice({
        tone: "success",
        title: "Done",
        description: "Settings saved.",
      });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Unable to save settings",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: "New passwords do not match.",
      });
      return;
    }
    setPasswordBusy(true);
    try {
      await apiFetch("/admin/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      await notice({
        tone: "success",
        title: "Done",
        description: "Password updated.",
      });
    } catch (err) {
      await notice({
        tone: "error",
        title: "Something went wrong",
        description: err instanceof Error ? err.message : "Unable to update password",
      });
    } finally {
      setPasswordBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {dialog}
      <PageHeader
        title="Settings"
        description="Site configuration and your admin account."
      />

      {loadError ? <Alert tone="error">{loadError}</Alert> : null}

      {loading ? (
        <p className="text-sm text-caisbe-muted">Loading settings…</p>
      ) : (
        <form onSubmit={(e) => void handleSave(e)}>
          <Card>
            <div className="space-y-6">
            <div>
              <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Profile</h2>
              <p className="mt-1 text-sm text-caisbe-muted">Signed-in admin account details.</p>
              <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-caisbe-muted">Name</dt>
                  <dd className="font-medium text-caisbe-text-dark">{me?.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-caisbe-muted">Email</dt>
                  <dd className="font-medium text-caisbe-text-dark">{me?.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-caisbe-muted">Role</dt>
                  <dd className="font-medium text-caisbe-text-dark">{me?.role ?? "—"}</dd>
                </div>
              </dl>
            </div>

            <div className="border-t border-ifma-border pt-6">
              <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Site</h2>
              <p className="mt-1 text-sm text-caisbe-muted">Public site name, support contact, and maintenance flag.</p>
              <div className="mt-4 grid max-w-xl gap-5">
                <FormField label="Site name">
                  <input
                    value={settings.siteName}
                    onChange={(e) => setSettings((s) => ({ ...s, siteName: e.target.value }))}
                    className={fieldClassName}
                    required
                  />
                </FormField>
                <FormField label="Support email">
                  <input
                    type="email"
                    value={settings.supportEmail}
                    onChange={(e) => setSettings((s) => ({ ...s, supportEmail: e.target.value }))}
                    className={fieldClassName}
                    required
                  />
                </FormField>
                <FormField label="Timezone">
                  <input
                    value={settings.timezone}
                    onChange={(e) => setSettings((s) => ({ ...s, timezone: e.target.value }))}
                    className={fieldClassName}
                    required
                  />
                </FormField>
                <label className="flex items-center gap-3 text-sm text-caisbe-text-dark">
                  <input
                    type="checkbox"
                    checked={settings.maintenanceMode}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maintenanceMode: e.target.checked }))
                    }
                    className="size-4 rounded border-ifma-border text-caisbe-green focus:ring-caisbe-green"
                  />
                  Maintenance mode
                </label>
              </div>
            </div>

            <SaveButton type="submit" dirty={dirty} saving={saving} idleLabel="Save settings" />
          </div>
      </Card>
        </form>
      )}

      <Card>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Change password</h2>
        <p className="mt-1 text-sm text-caisbe-muted">Use at least eight characters for your new password.</p>
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
