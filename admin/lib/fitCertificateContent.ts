"use client";

import { useLayoutEffect, type DependencyList, type RefObject } from "react";

const MIN_FIT = 0.72;
const TOLERANCE_PX = 2;

/** CSS font-size that scales with the middle-zone `--cert-fit` variable. */
export function certFitPx(basePx: number): string {
  return `calc(${basePx}px * var(--cert-fit, 1))`;
}

/**
 * Shrinks `--cert-fit` on the middle content zone until scrollHeight fits
 * within the fixed certificate frame (or the floor is reached).
 */
export function useCertificateContentFit(
  containerRef: RefObject<HTMLElement | null>,
  deps: DependencyList,
): void {
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;

    function applyFit(scale: number) {
      el!.style.setProperty("--cert-fit", String(scale));
    }

    function overflows() {
      return el!.scrollHeight > el!.clientHeight + TOLERANCE_PX;
    }

    function fit() {
      if (cancelled || !containerRef.current) return;
      applyFit(1);
      // Force layout before measuring.
      void el!.offsetHeight;
      if (!overflows()) return;

      let lo = MIN_FIT;
      let hi = 1;
      let best = MIN_FIT;
      for (let i = 0; i < 14; i += 1) {
        const mid = (lo + hi) / 2;
        applyFit(mid);
        void el!.offsetHeight;
        if (overflows()) {
          hi = mid;
        } else {
          best = mid;
          lo = mid;
        }
      }
      applyFit(best);
    }

    fit();
    void document.fonts.ready.then(() => {
      if (!cancelled) fit();
    });

    return () => {
      cancelled = true;
    };
    // Callers pass the text deps that affect layout height.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
