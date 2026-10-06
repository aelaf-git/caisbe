/** Client-side secure exam helpers built on shared content protection. */

import {
  attachAwayOverlay,
  attachContentProtection,
  isBlockedShortcut,
  type ProtectionEvent,
} from "@/lib/contentProtection";

export type PrecheckPayload = {
  rules_accepted: boolean;
  fullscreen_ok: boolean;
  visibility_api_ok: boolean;
  camera_ok: boolean;
  multi_monitor: boolean | null;
  user_agent: string;
};

export type IntegrityEvent = {
  phase: "pre" | "live" | "post";
  event_type: string;
  detail?: Record<string, unknown>;
};

export { isBlockedShortcut, attachAwayOverlay };

export async function requestFullscreen(el: HTMLElement): Promise<boolean> {
  try {
    if (document.fullscreenElement === el) return true;
    if (el.requestFullscreen) {
      await el.requestFullscreen();
      return document.fullscreenElement === el;
    }
    return false;
  } catch {
    return false;
  }
}

export async function exitFullscreenSafe(): Promise<void> {
  try {
    if (document.fullscreenElement && document.exitFullscreen) {
      await document.exitFullscreen();
    }
  } catch {
    // ignore
  }
}

export function isFullscreenActive(el?: HTMLElement | null): boolean {
  if (!el) return Boolean(document.fullscreenElement);
  return document.fullscreenElement === el;
}

export async function probeCamera(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    for (const track of stream.getTracks()) track.stop();
    return true;
  } catch {
    return false;
  }
}

export function detectMultiMonitor(): boolean | null {
  try {
    const screenObj = window.screen as Screen & { isExtended?: boolean };
    if (typeof screenObj.isExtended === "boolean") return screenObj.isExtended;
  } catch {
    // ignore
  }
  return null;
}

export function buildPrecheckCapabilities(
  rulesAccepted: boolean,
  fullscreenOk: boolean,
  cameraOk: boolean,
): PrecheckPayload {
  return {
    rules_accepted: rulesAccepted,
    fullscreen_ok: fullscreenOk,
    visibility_api_ok: typeof document !== "undefined" && typeof document.hidden === "boolean",
    camera_ok: cameraOk,
    multi_monitor: detectMultiMonitor(),
    user_agent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 512) : "",
  };
}

function toIntegrity(event: ProtectionEvent): IntegrityEvent {
  return {
    phase: "live",
    event_type: event.event_type,
    detail: event.detail,
  };
}

/** Exam lock listeners + away overlay + fullscreen exit tracking. */
export function attachExamLockListeners(
  root: HTMLElement,
  onEvent: (event: IntegrityEvent) => void,
): () => void {
  const detachProtection = attachContentProtection(root, {
    trackFocusLoss: true,
    onEvent: (event) => {
      // Courses only hide; exams still count tab_blur as a violation.
      if (event.event_type === "tab_focus") return;
      onEvent(toIntegrity(event));
    },
  });
  const detachOverlay = attachAwayOverlay(root, {
    message: "Exam content hidden while you leave this tab. Return to continue.",
  });

  const onFullscreen = () => {
    if (!isFullscreenActive(root)) {
      onEvent({ phase: "live", event_type: "fullscreen_exit" });
    }
  };
  document.addEventListener("fullscreenchange", onFullscreen);

  return () => {
    detachProtection();
    detachOverlay();
    document.removeEventListener("fullscreenchange", onFullscreen);
  };
}
