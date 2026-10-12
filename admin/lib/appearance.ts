import {
  appearanceBootScriptForStorageKey,
  appearanceFromUnknown,
  resetAppearanceAdjusted,
  type Appearance,
} from "@caisbe/platform/appearance";

export {
  applyAppearance,
  appearanceFromUnknown,
  canApplyRemoteAppearance,
  DEFAULT_APPEARANCE,
  FONT_OPTIONS,
  FONT_SIZE_OPTIONS,
  markAppearanceAdjusted,
  THEME_OPTIONS,
  type Appearance,
  type FontId,
  type FontSizeId,
  type ThemeId,
} from "@caisbe/platform/appearance";

export const APPEARANCE_STORAGE_KEY = "caisbe-admin-appearance";

export function readStoredAppearance(): Appearance | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (!raw) return null;
    return appearanceFromUnknown(JSON.parse(raw) as Partial<Appearance>);
  } catch {
    return null;
  }
}

export function writeStoredAppearance(appearance: Appearance) {
  localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearanceFromUnknown(appearance)));
  resetAppearanceAdjusted();
}

export function appearanceBootScript(): string {
  return appearanceBootScriptForStorageKey(APPEARANCE_STORAGE_KEY);
}
