"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_APPEARANCE,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  THEME_OPTIONS,
  applyAppearance,
  appearanceFromUnknown,
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
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setAppearance(readStoredAppearance() ?? DEFAULT_APPEARANCE);
  }, []);

  function update(patch: Partial<Appearance>) {
    const next = appearanceFromUnknown({ ...appearance, ...patch });
    setAppearance(next);
    markAppearanceAdjusted();
    applyAppearance(next);
    setSaved(false);
  }

  function save() {
    writeStoredAppearance(appearance);
    applyAppearance(appearance);
    setSaved(true);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-lg font-semibold text-caisbe-text-dark">Appearance</h2>
        <p className="mt-1 text-sm text-caisbe-muted">
          Theme, font size, and typefaces apply as you change them. Save to keep them for your next visit.
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

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          className="inline-flex h-11 items-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-red-dark"
        >
          Save appearance
        </button>
        {saved ? <p className="text-sm text-admin-success">Saved for this browser.</p> : null}
      </div>
    </div>
  );
}
