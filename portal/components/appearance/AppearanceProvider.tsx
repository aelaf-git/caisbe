"use client";

import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/components/auth/AuthProvider";
import {
  appearanceFromUser,
  applyAppearance,
  canApplyRemoteAppearance,
  clearActiveAppearance,
  writeStoredAppearance,
} from "@/lib/appearance";

export default function AppearanceProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      clearActiveAppearance();
      return;
    }

    // Do not clobber an in-progress preview for this session.
    if (!canApplyRemoteAppearance()) return;

    const next = appearanceFromUser(user);
    writeStoredAppearance(user.id, next);
    applyAppearance(next);
  }, [user, loading]);

  return children;
}
