export const APPEARANCE_STORAGE_KEY = "caisbe-portal-appearance";

export const FONT_OPTIONS = [
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
  fontBody: "roboto",
  fontDisplay: "open-sans",
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

export function appearanceFromUnknown(value: Partial<Appearance> | null | undefined): Appearance {
  return {
    theme: value?.theme === "dark" ? "dark" : "light",
    fontSize: isFontSize(value?.fontSize) ? value.fontSize : DEFAULT_APPEARANCE.fontSize,
    fontBody: isFontId(value?.fontBody) ? value.fontBody : DEFAULT_APPEARANCE.fontBody,
    fontDisplay: isFontId(value?.fontDisplay) ? value.fontDisplay : DEFAULT_APPEARANCE.fontDisplay,
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
  userAdjusted = false;
}

export function appearanceBootScript(): string {
  const sizes = JSON.stringify(FONT_SIZE_PX);
  const fonts = JSON.stringify(Object.fromEntries(FONT_OPTIONS.map((font) => [font.id, font.variable])));
  const dark = JSON.stringify(DARK_VARS);
  const key = JSON.stringify(APPEARANCE_STORAGE_KEY);
  return `(function(){try{var raw=localStorage.getItem(${key});if(!raw)return;var a=JSON.parse(raw);var root=document.documentElement;var sizes=${sizes};var fonts=${fonts};var dark=${dark};if(sizes[a.fontSize])root.style.fontSize=sizes[a.fontSize];if(fonts[a.fontBody])root.style.setProperty("--caisbe-font-body","var("+fonts[a.fontBody]+")");if(fonts[a.fontDisplay])root.style.setProperty("--caisbe-font-display","var("+fonts[a.fontDisplay]+")");root.style.colorScheme=a.theme==="dark"?"dark":"light";if(a.theme==="dark"){Object.keys(dark).forEach(function(name){root.style.setProperty(name,dark[name]);});}}catch(e){}})();`;
}
