"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/auth";
import { useAutosaveRegistry, type AutosaveStatus } from "@/hooks/autosaveContext";

type UseAutosaveOptions<T> = {
  id: string;
  value: T;
  save: (value: T) => Promise<void>;
  /** When this changes, the current value is treated as already saved (e.g. after load). */
  baselineKey: string | number;
  enabled?: boolean;
  delayMs?: number;
  isEqual?: (a: T, b: T) => boolean;
};

function defaultEqual<T>(a: T, b: T): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail;
  if (err instanceof Error) return err.message;
  return "Unable to save draft.";
}

export function useAutosave<T>({
  id,
  value,
  save,
  baselineKey,
  enabled = true,
  delayMs = 700,
  isEqual = defaultEqual,
}: UseAutosaveOptions<T>) {
  const { register, unregister, setUnitStatus } = useAutosaveRegistry();
  const [status, setStatus] = useState<AutosaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const valueRef = useRef(value);
  const savedRef = useRef(value);
  const saveRef = useRef(save);
  const enabledRef = useRef(enabled);
  const isEqualRef = useRef(isEqual);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef<Promise<void> | null>(null);
  const baselineRef = useRef(baselineKey);

  valueRef.current = value;
  saveRef.current = save;
  enabledRef.current = enabled;
  isEqualRef.current = isEqual;

  const report = useCallback(
    (next: AutosaveStatus) => {
      setStatus(next);
      setUnitStatus(id, next);
    },
    [id, setUnitStatus],
  );

  // Reset baseline when server data is (re)loaded.
  useEffect(() => {
    if (baselineRef.current === baselineKey) return;
    baselineRef.current = baselineKey;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    savedRef.current = valueRef.current;
    setError(null);
    report("idle");
  }, [baselineKey, report]);

  const runSave = useCallback(async () => {
    if (!enabledRef.current) return;
    const next = valueRef.current;
    if (isEqualRef.current(next, savedRef.current)) {
      report("saved");
      return;
    }

    report("saving");
    setError(null);
    try {
      await saveRef.current(next);
      savedRef.current = next;
      report("saved");
      if (!isEqualRef.current(valueRef.current, savedRef.current)) {
        report("pending");
        timerRef.current = setTimeout(() => {
          timerRef.current = null;
          void runSave().catch(() => undefined);
        }, 0);
      }
    } catch (err) {
      setError(errorMessage(err));
      report("error");
      throw err;
    }
  }, [report]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (inFlightRef.current) {
      try {
        await inFlightRef.current;
      } catch {
        // prior failure already reported
      }
    }
    if (!enabledRef.current) return;
    if (isEqualRef.current(valueRef.current, savedRef.current)) return;

    const task = runSave();
    inFlightRef.current = task.finally(() => {
      inFlightRef.current = null;
    });
    await task;
  }, [runSave]);

  useEffect(() => {
    register(id, flush);
    return () => {
      unregister(id);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [flush, id, register, unregister]);

  useEffect(() => {
    if (!enabled) return;
    if (baselineRef.current !== baselineKey) return;
    if (isEqual(value, savedRef.current)) return;

    report("pending");
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      const task = runSave().catch(() => undefined);
      inFlightRef.current = task.finally(() => {
        inFlightRef.current = null;
      });
    }, delayMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [value, enabled, delayMs, isEqual, report, runSave, baselineKey]);

  return { status, error, flush };
}
