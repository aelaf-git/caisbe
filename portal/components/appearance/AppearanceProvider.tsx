"use client";

import { useEffect, type ReactNode } from "react";
import {
  applyAppearance,
  readStoredAppearance,
} from "@/lib/appearance";

export default function AppearanceProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    const stored = readStoredAppearance();
    if (stored) applyAppearance(stored);
  }, []);

  return children;
}
