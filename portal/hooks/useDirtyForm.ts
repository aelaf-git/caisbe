"use client";

import { useCallback, useMemo, useRef, useState } from "react";

function stableSerialize(value: unknown): string {
  return JSON.stringify(value, (_, entry) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry)) {
      return Object.fromEntries(
        Object.keys(entry as Record<string, unknown>)
          .sort()
          .map((key) => [key, (entry as Record<string, unknown>)[key]]),
      );
    }
    return entry;
  });
}

/**
 * Tracks whether `values` differ from the last saved/loaded baseline.
 * Call `markSaved(values?)` after a successful save (defaults to current values).
 * Call `resetBaseline(values)` when loading a different record.
 */
export function useDirtyForm<T>(values: T) {
  const valuesRef = useRef(values);
  valuesRef.current = values;

  const [baseline, setBaseline] = useState(() => stableSerialize(values));
  const current = useMemo(() => stableSerialize(values), [values]);
  const dirty = current !== baseline;

  const markSaved = useCallback((next?: T) => {
    setBaseline(stableSerialize(next ?? valuesRef.current));
  }, []);

  const resetBaseline = useCallback((next: T) => {
    setBaseline(stableSerialize(next));
  }, []);

  return { dirty, markSaved, resetBaseline };
}
