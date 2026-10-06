"use client";

import { useEffect, useRef, type ReactNode } from "react";
import {
  PROTECTED_CONTENT_STYLE,
  attachAwayOverlay,
  attachContentProtection,
} from "@/lib/contentProtection";

export default function ContentProtectionShell({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    const detachProtection = attachContentProtection(root, { trackFocusLoss: true });
    const detachOverlay = attachAwayOverlay(root, {
      message: "Course content is hidden while you are away from this tab.",
    });
    return () => {
      detachProtection();
      detachOverlay();
    };
  }, [enabled]);

  if (!enabled) {
    return <>{children}</>;
  }

  return (
    <div ref={rootRef} className="relative select-none outline-none" style={PROTECTED_CONTENT_STYLE}>
      {children}
      <p className="mt-3 text-xs text-caisbe-muted">Protected content — copying is disabled.</p>
    </div>
  );
}
