export const APPEARANCE_STORAGE_PREFIX = "caisbe-portal-appearance";
/** Tracks which student's prefs the boot script should load (never a shared blob). */
export const APPEARANCE_ACTIVE_USER_KEY = "caisbe-portal-appearance-user";
/** Legacy shared key — ignored so one student's theme cannot leak to another. */
export const APPEARANCE_LEGACY_STORAGE_KEY = "caisbe-portal-appearance";

export const FONT_OPTIONS = [
  { id: "nunito", label: "Nunito Sans", variable: "--font-nunito" },
  { id: "poppins", label: "Poppins", variable: "--font-poppins" },
  { id: "roboto", label: "Roboto", variable: "--font-roboto" },
  { id: "open-sans", label: "Open Sans", variable: "--font-open-sans" },
  { id: "inter", label: "Inter", variable: "--font-inter" },
  { id: "source-sans", label: "Source Sans", variable: "--font-source-sans" },
  { id: "merriweather", label: "Merriweather", variable: "--font-merriweather" },
  { id: "source-serif", label: "Source Serif", variable: "--font-source-serif" },
] as const;

export const FONT_SIZE_OPTIONS = [
  { id: "sm", label: "Small" },
  { id: "md", label: "Default" },
  { id: "lg", label: "Large" },
  { id: "xl", label: "Extra large" },
] as const;

export const THEME_OPTIONS = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
] as const;

export type FontId = (typeof FONT_OPTIONS)[number]["id"];
export type FontSizeId = (typeof FONT_SIZE_OPTIONS)[number]["id"];
export type ThemeId = (typeof THEME_OPTIONS)[number]["id"];

export type Appearance = {
  theme: ThemeId;
  fontSize: FontSizeId;
  fontBody: FontId;
  fontDisplay: FontId;
};

export const DEFAULT_APPEARANCE: Appearance = {
  theme: "light",
  fontSize: "md",
  fontBody: "nunito",
  fontDisplay: "poppins",
};

const FONT_SIZE_PX: Record<FontSizeId, string> = {
  sm: "14px",
  md: "16px",
  lg: "18px",
  xl: "20px",
};

const DARK_VARS: Record<string, string> = {
  "--caisbe-background": "#12141a",
  "--caisbe-foreground": "#e7e9ee",
  "--caisbe-canvas": "#12141a",
  "--caisbe-surface": "#1c1f2a",
  "--caisbe-surface-muted": "#262a36",
  "--caisbe-text": "#e7e9ee",
  "--caisbe-text-dark": "#f8f9fb",
  "--caisbe-muted": "#a8b0bd",
  "--caisbe-border": "#3a3f4e",
  "--caisbe-border-light": "#2c3140",
  "--caisbe-success": "#5dcea0",
  "--caisbe-success-soft": "#143226",
  "--caisbe-warning": "#e0b15a",
  "--caisbe-warning-soft": "#3a2e10",
  "--caisbe-info": "#8ebfff",
  "--caisbe-info-soft": "#16283f",
};

let userAdjusted = false;

export function markAppearanceAdjusted() {
  userAdjusted = true;
}

export function canApplyRemoteAppearance() {
  return !userAdjusted;
}

function isFontSize(value: unknown): value is FontSizeId {
  return FONT_SIZE_OPTIONS.some((option) => option.id === value);
}

function isFontId(value: unknown): value is FontId {
  return FONT_OPTIONS.some((option) => option.id === value);
}

export function appearanceStorageKey(userId: number | string): string {
  return `${APPEARANCE_STORAGE_PREFIX}:u${userId}`;
}

export function appearanceFromUnknown(value: Partial<Appearance> | null | undefined): Appearance {
  return {
    theme: value?.theme === "dark" ? "dark" : "light",
    fontSize: isFontSize(value?.fontSize) ? value.fontSize : DEFAULT_APPEARANCE.fontSize,
    fontBody: isFontId(value?.fontBody) ? value.fontBody : DEFAULT_APPEARANCE.fontBody,
    fontDisplay: isFontId(value?.fontDisplay) ? value.fontDisplay : DEFAULT_APPEARANCE.fontDisplay,
  };
}

/** Map API user fields → portal Appearance. */
export function appearanceFromUser(user: {
  ui_theme?: string | null;
  ui_font_size?: string | null;
  ui_font_body?: string | null;
  ui_font_display?: string | null;
} | null | undefined): Appearance {
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

export function applyAppearance(appearance: Appearance) {
  if (typeof document === "undefined") return;
  const next = appearanceFromUnknown(appearance);
  const root = document.documentElement;
  root.style.fontSize = FONT_SIZE_PX[next.fontSize];
  root.style.colorScheme = next.theme;
  const body = FONT_OPTIONS.find((font) => font.id === next.fontBody);
  const display = FONT_OPTIONS.find((font) => font.id === next.fontDisplay);
  if (body) root.style.setProperty("--caisbe-font-body", `var(${body.variable})`);
  if (display) root.style.setProperty("--caisbe-font-display", `var(${display.variable})`);
  if (next.theme === "dark") {
    for (const [key, val] of Object.entries(DARK_VARS)) {
      root.style.setProperty(key, val);
    }
    return;
  }
  for (const key of Object.keys(DARK_VARS)) {
    root.style.removeProperty(key);
  }
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
    // Never read the legacy shared key — it mixed students on one browser.
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
  localStorage.setItem(
    appearanceStorageKey(userId),
    JSON.stringify(appearanceFromUnknown(appearance)),
  );
  setActiveAppearanceUserId(userId);
  userAdjusted = false;
}

/** Reset DOM + active-user pointer on logout (keep other students' cached keys). */
export function clearActiveAppearance() {
  userAdjusted = false;
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
