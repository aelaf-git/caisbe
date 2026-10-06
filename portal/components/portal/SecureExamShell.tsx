"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { apiFetch } from "@/lib/auth";
import { PROTECTED_CONTENT_STYLE } from "@/lib/contentProtection";
import {
  attachExamLockListeners,
  isFullscreenActive,
  requestFullscreen,
  type IntegrityEvent,
} from "@/lib/examSecurity";

type IntegrityState = {
  violation_count: number;
  max_integrity_violations: number;
  locked_out: boolean;
  force_submit: boolean;
};

export default function SecureExamShell({
  courseId,
  enabled,
  maxViolations,
  onForceSubmit,
  children,
}: {
  courseId: number;
  enabled: boolean;
  maxViolations: number;
  onForceSubmit: () => void;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const queueRef = useRef<IntegrityEvent[]>([]);
  const flushTimer = useRef<number | null>(null);
  const [paused, setPaused] = useState(false);
  const [violations, setViolations] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const forcedRef = useRef(false);

  const flush = useCallback(async () => {
    if (!enabled || queueRef.current.length === 0) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    try {
      const state = await apiFetch<IntegrityState>(`/me/courses/${courseId}/final-exam/integrity`, {
        method: "POST",
        body: JSON.stringify({ events: batch }),
      });
      setViolations(state.violation_count);
      setLockedOut(state.locked_out);
      if (state.force_submit && !forcedRef.current) {
        forcedRef.current = true;
        onForceSubmit();
      }
    } catch {
      queueRef.current.unshift(...batch);
    }
  }, [courseId, enabled, onForceSubmit]);

  const enqueue = useCallback(
    (event: IntegrityEvent) => {
      if (!enabled) return;
      queueRef.current.push(event);
      if (event.event_type === "fullscreen_exit" || event.event_type === "tab_blur") {
        setPaused(true);
      }
      if (flushTimer.current != null) window.clearTimeout(flushTimer.current);
      flushTimer.current = window.setTimeout(() => {
        void flush();
      }, 300);
    },
    [enabled, flush],
  );

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    void requestFullscreen(root);
    const detach = attachExamLockListeners(root, enqueue);
    const heartbeat = window.setInterval(() => {
      enqueue({ phase: "live", event_type: "heartbeat" });
    }, 15_000);
    return () => {
      detach();
      window.clearInterval(heartbeat);
      if (flushTimer.current != null) window.clearTimeout(flushTimer.current);
      void flush();
    };
  }, [enabled, enqueue, flush]);

  async function resumeFullscreen() {
    const root = rootRef.current;
    if (!root) return;
    const ok = await requestFullscreen(root);
    if (ok || isFullscreenActive(root)) {
      setPaused(false);
      enqueue({ phase: "live", event_type: "fullscreen_restored" });
    }
  }

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={rootRef} className="relative select-none bg-admin-canvas outline-none" style={PROTECTED_CONTENT_STYLE}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-md border border-ifma-border bg-admin-surface px-3 py-2 text-xs font-semibold uppercase tracking-wide text-caisbe-muted">
        <span>Secure exam mode</span>
        <span className={violations > 0 ? "text-caisbe-red" : undefined}>
          Integrity flags: {violations}/{maxViolations}
          {lockedOut ? " · locked" : ""}
        </span>
      </div>

      {paused || lockedOut ? (
        <div className="mb-4 space-y-3 rounded-md border border-caisbe-red/40 bg-caisbe-red/5 px-4 py-4">
          <p className="text-sm font-semibold text-caisbe-text-dark">
            {lockedOut
              ? "This attempt was locked after too many integrity violations. Your exam will be submitted as failed."
              : "Exam paused — return to fullscreen and stay on this tab."}
          </p>
          {!lockedOut ? (
            <button
              type="button"
              onClick={() => void resumeFullscreen()}
              className="rounded-md border-2 border-caisbe-red bg-caisbe-red px-5 py-2 text-sm font-semibold uppercase text-white hover:bg-caisbe-red-dark"
            >
              Resume fullscreen
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={paused || lockedOut ? "pointer-events-none opacity-40" : undefined}>{children}</div>
    </div>
  );
}
