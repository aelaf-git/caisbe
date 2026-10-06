/**
 * Shared web content protection (courses + exams).
 * Deterrence only — cannot fully block OS screenshots or native capture tools.
 */

export type ProtectionEventType =
  | "copy_attempt"
  | "cut_attempt"
  | "paste_attempt"
  | "context_menu"
  | "print_attempt"
  | "devtools_attempt"
  | "tab_blur"
  | "tab_focus"
  | "drag_attempt";

export type ProtectionEvent = {
  event_type: ProtectionEventType;
  detail?: Record<string, unknown>;
};

const BLOCKED_KEYS = new Set(["c", "v", "x", "a", "p", "s", "u"]);

export function isBlockedShortcut(event: KeyboardEvent): boolean {
  const key = event.key.toLowerCase();
  const mod = event.ctrlKey || event.metaKey;
  if (mod && BLOCKED_KEYS.has(key)) return true;
  if (mod && event.shiftKey && (key === "i" || key === "j" || key === "c")) return true;
  if (key === "f12" || key === "printscreen") return true;
  return false;
}

export type AttachProtectionOptions = {
  /** When true, also emit tab_blur on window blur / visibility hidden. */
  trackFocusLoss?: boolean;
  onEvent?: (event: ProtectionEvent) => void;
};

/**
 * Block copy/paste/context menu/shortcuts on `root` (and document key/print handlers).
 */
export function attachContentProtection(
  root: HTMLElement,
  options: AttachProtectionOptions = {},
): () => void {
  const trackFocusLoss = options.trackFocusLoss !== false;
  const onEvent = options.onEvent ?? (() => undefined);

  const prevent = (e: Event, event_type: ProtectionEventType, detail?: Record<string, unknown>) => {
    e.preventDefault();
    onEvent({ event_type, detail });
  };

  const onCopy = (e: Event) => prevent(e, "copy_attempt");
  const onCut = (e: Event) => prevent(e, "cut_attempt");
  const onPaste = (e: Event) => prevent(e, "paste_attempt");
  const onContext = (e: Event) => prevent(e, "context_menu");
  const onDrag = (e: Event) => prevent(e, "drag_attempt");
  const onSelectStart = (e: Event) => {
    e.preventDefault();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (!isBlockedShortcut(e)) return;
    e.preventDefault();
    e.stopPropagation();
    const key = e.key.toLowerCase();
    if (key === "c") onEvent({ event_type: "copy_attempt" });
    else if (key === "v") onEvent({ event_type: "paste_attempt" });
    else if (key === "x") onEvent({ event_type: "cut_attempt" });
    else if (key === "p") onEvent({ event_type: "print_attempt" });
    else onEvent({ event_type: "devtools_attempt", detail: { key } });
  };

  const onVisibility = () => {
    if (!trackFocusLoss) return;
    if (document.hidden) {
      onEvent({ event_type: "tab_blur", detail: { reason: "hidden" } });
    } else {
      onEvent({ event_type: "tab_focus", detail: { reason: "visible" } });
    }
  };

  const onBlur = () => {
    if (!trackFocusLoss) return;
    onEvent({ event_type: "tab_blur", detail: { reason: "window_blur" } });
  };

  const onFocus = () => {
    if (!trackFocusLoss) return;
    if (!document.hidden) {
      onEvent({ event_type: "tab_focus", detail: { reason: "window_focus" } });
    }
  };

  const onBeforePrint = () => {
    onEvent({ event_type: "print_attempt" });
  };

  root.addEventListener("copy", onCopy);
  root.addEventListener("cut", onCut);
  root.addEventListener("paste", onPaste);
  root.addEventListener("contextmenu", onContext);
  root.addEventListener("dragstart", onDrag);
  root.addEventListener("selectstart", onSelectStart);
  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("blur", onBlur);
  window.addEventListener("focus", onFocus);
  window.addEventListener("beforeprint", onBeforePrint);

  return () => {
    root.removeEventListener("copy", onCopy);
    root.removeEventListener("cut", onCut);
    root.removeEventListener("paste", onPaste);
    root.removeEventListener("contextmenu", onContext);
    root.removeEventListener("dragstart", onDrag);
    root.removeEventListener("selectstart", onSelectStart);
    document.removeEventListener("keydown", onKeyDown, true);
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("blur", onBlur);
    window.removeEventListener("focus", onFocus);
    window.removeEventListener("beforeprint", onBeforePrint);
  };
}

/** Soft screenshot deterrence: cover root while the tab/window is not focused. */
export function attachAwayOverlay(
  root: HTMLElement,
  options: { message?: string } = {},
): () => void {
  const message = options.message ?? "Content hidden while you are away from this tab.";
  const overlay = document.createElement("div");
  overlay.setAttribute("data-content-protection-overlay", "1");
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.cssText = [
    "position:absolute",
    "inset:0",
    "z-index:50",
    "display:none",
    "align-items:center",
    "justify-content:center",
    "padding:1.5rem",
    "text-align:center",
    "background:rgba(18,20,26,0.96)",
    "color:#f8f9fb",
    "font:600 0.875rem/1.5 system-ui,sans-serif",
    "backdrop-filter:blur(12px)",
    "-webkit-backdrop-filter:blur(12px)",
  ].join(";");
  overlay.textContent = message;

  const previousPosition = root.style.position;
  if (!root.style.position || root.style.position === "static") {
    root.style.position = "relative";
  }
  root.appendChild(overlay);

  const sync = () => {
    const away = document.hidden || !document.hasFocus();
    overlay.style.display = away ? "flex" : "none";
  };

  document.addEventListener("visibilitychange", sync);
  window.addEventListener("blur", sync);
  window.addEventListener("focus", sync);
  sync();

  return () => {
    document.removeEventListener("visibilitychange", sync);
    window.removeEventListener("blur", sync);
    window.removeEventListener("focus", sync);
    overlay.remove();
    root.style.position = previousPosition;
  };
}

export const PROTECTED_CONTENT_STYLE = {
  WebkitUserSelect: "none" as const,
  userSelect: "none" as const,
};
