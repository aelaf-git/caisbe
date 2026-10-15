"use client";

import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
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
  const { user } = useAuth();

  const watermarkStamp = useMemo(() => {
    if (!user) return "CAISBE PROTECTED COURSE CONTENT";
    return `CAISBE • ${user.email} • ID#${user.id}`;
  }, [user]);

  useEffect(() => {
    if (!enabled) return;
    const root = rootRef.current;
    if (!root) return;
    const detachProtection = attachContentProtection(root, {
      trackFocusLoss: true,
      allowAnswerPaste: true,
    });
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
    <>
      <div
        ref={rootRef}
        data-nosnippet
        className="relative overflow-hidden select-none outline-none print:hidden"
        style={PROTECTED_CONTENT_STYLE}
      >
        {children}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[15] grid grid-cols-2 gap-12 overflow-hidden p-6 opacity-[0.045] select-none sm:grid-cols-3"
        >
          {Array.from({ length: 12 }).map((_, index) => (
            <span
              key={index}
              className="flex items-center justify-center -rotate-12 text-center font-mono text-xs font-semibold tracking-widest whitespace-nowrap text-caisbe-text-dark"
            >
              {watermarkStamp}
            </span>
          ))}
        </div>
      </div>
      <div className="hidden rounded-md border border-caisbe-red/30 bg-caisbe-red/5 p-6 text-center text-sm font-semibold text-caisbe-red print:block">
        Printing, saving, or automated extraction of CAISBE course material is prohibited ({watermarkStamp}).
      </div>
    </>
  );
}
