import {
  appearanceFromUnknown,
  applyAppearance,
  DARK_VARS,
  DEFAULT_APPEARANCE,
  FONT_OPTIONS,
  FONT_SIZE_PX,
  resetAppearanceAdjusted,
  type Appearance,
  type FontId,
  type FontSizeId,
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

export const APPEARANCE_STORAGE_PREFIX = "caisbe-portal-appearance";
/** Tracks which student's prefs the boot script should load (never a shared blob). */
export const APPEARANCE_ACTIVE_USER_KEY = "caisbe-portal-appearance-user";
/** Legacy shared key — ignored so one student's theme cannot leak to another. */
export const APPEARANCE_LEGACY_STORAGE_KEY = "caisbe-portal-appearance";

export function appearanceStorageKey(userId: number | string): string {
  return `${APPEARANCE_STORAGE_PREFIX}:u${userId}`;
}

/** Map API user fields → portal Appearance. */
export function appearanceFromUser(
  user:
    | {
        ui_theme?: string | null;
        ui_font_size?: string | null;
        ui_font_body?: string | null;
        ui_font_display?: string | null;
      }
    | null
    | undefined,
): Appearance {
  if (!user) return DEFAULT_APPEARANCE;
  return appearanceFromUnknown({
    theme: user.ui_theme === "dark" ? "dark" : "light",
    fontSize: user.ui_font_size as FontSizeId | undefined,
    fontBody: user.ui_font_body as FontId | undefined,
    fontDisplay: user.ui_font_display as FontId | undefined,
  });
}

export function appearanceToApiPayload(appearance: Appearance) {
  const next = appearanceFromUnknown(appearance);
  return {
    ui_theme: next.theme,
    ui_font_size: next.fontSize,
    ui_font_body: next.fontBody,
    ui_font_display: next.fontDisplay,
  };
}

export function getActiveAppearanceUserId(): number | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(APPEARANCE_ACTIVE_USER_KEY);
  if (!raw) return null;
  const id = Number(raw);
  return Number.isFinite(id) && id > 0 ? id : null;
}

export function setActiveAppearanceUserId(userId: number | null) {
  if (typeof window === "undefined") return;
  if (userId == null) {
    localStorage.removeItem(APPEARANCE_ACTIVE_USER_KEY);
    return;
  }
  localStorage.setItem(APPEARANCE_ACTIVE_USER_KEY, String(userId));
}

export function readStoredAppearance(userId: number | null | undefined): Appearance | null {
  if (typeof window === "undefined" || userId == null) return null;
  try {
    localStorage.removeItem(APPEARANCE_LEGACY_STORAGE_KEY);
    const raw = localStorage.getItem(appearanceStorageKey(userId));
    if (!raw) return null;
    return appearanceFromUnknown(JSON.parse(raw) as Partial<Appearance>);
  } catch {
    return null;
  }
}

export function writeStoredAppearance(userId: number, appearance: Appearance) {
  if (typeof window === "undefined") return;
  localStorage.removeItem(APPEARANCE_LEGACY_STORAGE_KEY);
  localStorage.setItem(appearanceStorageKey(userId), JSON.stringify(appearanceFromUnknown(appearance)));
  setActiveAppearanceUserId(userId);
  resetAppearanceAdjusted();
}

/** Reset DOM + active-user pointer on logout (keep other students' cached keys). */
export function clearActiveAppearance() {
  resetAppearanceAdjusted();
  setActiveAppearanceUserId(null);
  applyAppearance(DEFAULT_APPEARANCE);
}

export function appearanceBootScript(): string {
  const sizes = JSON.stringify(FONT_SIZE_PX);
  const fonts = JSON.stringify(Object.fromEntries(FONT_OPTIONS.map((font) => [font.id, font.variable])));
  const dark = JSON.stringify(DARK_VARS);
  const prefix = JSON.stringify(APPEARANCE_STORAGE_PREFIX);
  const activeKey = JSON.stringify(APPEARANCE_ACTIVE_USER_KEY);
  const legacyKey = JSON.stringify(APPEARANCE_LEGACY_STORAGE_KEY);
  return `(function(){try{localStorage.removeItem(${legacyKey});var uid=localStorage.getItem(${activeKey});if(!uid)return;var raw=localStorage.getItem(${prefix}+":u"+uid);if(!raw)return;var a=JSON.parse(raw);var root=document.documentElement;var sizes=${sizes};var fonts=${fonts};var dark=${dark};if(sizes[a.fontSize])root.style.fontSize=sizes[a.fontSize];if(fonts[a.fontBody])root.style.setProperty("--caisbe-font-body","var("+fonts[a.fontBody]+")");if(fonts[a.fontDisplay])root.style.setProperty("--caisbe-font-display","var("+fonts[a.fontDisplay]+")");root.style.colorScheme=a.theme==="dark"?"dark":"light";if(a.theme==="dark"){Object.keys(dark).forEach(function(name){root.style.setProperty(name,dark[name]);});}}catch(e){}})();`;
}
