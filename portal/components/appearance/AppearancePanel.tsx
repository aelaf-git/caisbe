"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import SaveButton from "@/components/ui/SaveButton";
import { useDirtyForm } from "@/hooks/useDirtyForm";
import { apiFetch, ApiError, type AuthUser } from "@/lib/auth";
import {
  DEFAULT_APPEARANCE,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  THEME_OPTIONS,
  appearanceFromUnknown,
  appearanceFromUser,
  appearanceToApiPayload,
  applyAppearance,
  markAppearanceAdjusted,
  readStoredAppearance,
  writeStoredAppearance,
  type Appearance,
} from "@/lib/appearance";

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`h-10 rounded-md border-2 px-4 text-sm font-semibold transition-colors ${
        selected
          ? "border-caisbe-red bg-caisbe-red/10 text-caisbe-red"
          : "border-ifma-border bg-admin-surface text-caisbe-text hover:border-caisbe-red/40"
      }`}
    >
      {children}
    </button>
  );
}

export default function AppearancePanel() {
  const { user, refreshUser } = useAuth();
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const formValues = useMemo(() => appearance, [appearance]);
  const { dirty, markSaved, resetBaseline } = useDirtyForm(formValues);

  useEffect(() => {
    if (!user) {
      setAppearance(DEFAULT_APPEARANCE);
      resetBaseline(DEFAULT_APPEARANCE);
      return;
    }
    const loaded =
      appearanceFromUser(user) ?? readStoredAppearance(user.id) ?? DEFAULT_APPEARANCE;
    setAppearance(loaded);
    resetBaseline(loaded);
    applyAppearance(loaded);
  }, [user, resetBaseline]);

  function update(patch: Partial<Appearance>) {
    const next = appearanceFromUnknown({ ...appearance, ...patch });
    setAppearance(next);
    markAppearanceAdjusted();
    applyAppearance(next);
    setSaved(false);
    setError(null);
  }

  async function save() {
    if (!dirty || !user || saving) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await apiFetch<AuthUser>("/auth/me/appearance", {
        method: "PATCH",
        body: JSON.stringify(appearanceToApiPayload(appearance)),
      });
      const next = appearanceFromUser(updated);
      writeStoredAppearance(user.id, next);
      applyAppearance(next);
      setAppearance(next);
      markSaved(next);
      setSaved(true);
      await refreshUser();
    } catch (err) {
      setError(err instanceof ApiError ? err.detail : "Unable to save appearance.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <p className="text-sm text-caisbe-muted">Sign in to manage your appearance settings.</p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Appearance</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Theme, font size, and typefaces apply only to your account. Other students keep their own
          settings.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-semibold text-caisbe-text">Theme</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {THEME_OPTIONS.map((option) => (
            <OptionButton
              key={option.id}
              selected={appearance.theme === option.id}
              onClick={() => update({ theme: option.id })}
            >
              {option.label}
            </OptionButton>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-caisbe-text">Font size</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FONT_SIZE_OPTIONS.map((option) => (
            <OptionButton
              key={option.id}
              selected={appearance.fontSize === option.id}
              onClick={() => update({ fontSize: option.id })}
            >
              {option.label}
            </OptionButton>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-caisbe-text">Body font</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FONT_OPTIONS.map((option) => (
            <OptionButton
              key={option.id}
              selected={appearance.fontBody === option.id}
              onClick={() => update({ fontBody: option.id })}
            >
              {option.label}
            </OptionButton>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-semibold text-caisbe-text">Heading font</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {FONT_OPTIONS.map((option) => (
            <OptionButton
              key={option.id}
              selected={appearance.fontDisplay === option.id}
              onClick={() => update({ fontDisplay: option.id })}
            >
              {option.label}
            </OptionButton>
          ))}
        </div>
      </fieldset>

      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}

      <div className="flex flex-wrap items-center gap-3">
        <SaveButton
          dirty={dirty}
          idleLabel={saving ? "Saving…" : "Save appearance"}
          onClick={() => void save()}
        />
        {saved ? <p className="text-sm text-admin-success">Saved for your account only.</p> : null}
      </div>
    </div>
  );
}
