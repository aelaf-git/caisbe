"use client";

import { useEffect, type ReactNode } from "react";
import { apiFetch, getToken } from "@/lib/auth";
import {
  appearanceFromUnknown,
  applyAppearance,
  canApplyRemoteAppearance,
  readStoredAppearance,
  writeStoredAppearance,
  type Appearance,
  type FontId,
  type FontSizeId,
  type ThemeId,
} from "@/lib/appearance";

type AppearanceSettings = {
  ui_theme: ThemeId;
  ui_font_size: FontSizeId;
  ui_font_body: FontId;
  ui_font_display: FontId;
};

function fromSettings(data: AppearanceSettings): Appearance {
  return appearanceFromUnknown({
    theme: data.ui_theme,
    fontSize: data.ui_font_size,
    fontBody: data.ui_font_body,
    fontDisplay: data.ui_font_display,
  });
}

export default function AppearanceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = readStoredAppearance();
    if (stored) applyAppearance(stored);

    if (!getToken()) return;
    let active = true;
    void apiFetch<AppearanceSettings>("/admin/settings")
      .then((data) => {
        if (!active || !canApplyRemoteAppearance()) return;
        const next = fromSettings(data);
        applyAppearance(next);
        writeStoredAppearance(next);
      })
      .catch(() => {
        /* Login and signed-out screens keep the last saved look. */
      });
    return () => {
      active = false;
    };
  }, []);

  return children;
}
