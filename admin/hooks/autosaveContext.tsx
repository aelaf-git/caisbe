"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type AutosaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

type FlushFn = () => Promise<void>;

type AutosaveContextValue = {
  register: (id: string, flush: FlushFn) => void;
  unregister: (id: string) => void;
  flushAll: () => Promise<void>;
  setUnitStatus: (id: string, status: AutosaveStatus) => void;
  overallStatus: AutosaveStatus;
};

const AutosaveContext = createContext<AutosaveContextValue | null>(null);

function rank(status: AutosaveStatus): number {
  switch (status) {
    case "error":
      return 4;
    case "saving":
      return 3;
    case "pending":
      return 2;
    case "saved":
      return 1;
    default:
      return 0;
  }
}

function aggregate(statuses: Iterable<AutosaveStatus>): AutosaveStatus {
  let best: AutosaveStatus = "idle";
  for (const status of statuses) {
    if (rank(status) > rank(best)) best = status;
  }
  return best;
}

export function AutosaveProvider({ children }: { children: ReactNode }) {
  const flushes = useRef(new Map<string, FlushFn>());
  const [unitStatuses, setUnitStatuses] = useState<Record<string, AutosaveStatus>>({});

  const register = useCallback((id: string, flush: FlushFn) => {
    flushes.current.set(id, flush);
  }, []);

  const unregister = useCallback((id: string) => {
    flushes.current.delete(id);
    setUnitStatuses((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  const flushAll = useCallback(async () => {
    const tasks = [...flushes.current.values()].map((flush) => flush());
    await Promise.all(tasks);
  }, []);

  const setUnitStatus = useCallback((id: string, status: AutosaveStatus) => {
    setUnitStatuses((prev) => (prev[id] === status ? prev : { ...prev, [id]: status }));
  }, []);

  const overallStatus = useMemo(
    () => aggregate(Object.values(unitStatuses)),
    [unitStatuses],
  );

  const value = useMemo(
    () => ({ register, unregister, flushAll, setUnitStatus, overallStatus }),
    [register, unregister, flushAll, setUnitStatus, overallStatus],
  );

  return <AutosaveContext.Provider value={value}>{children}</AutosaveContext.Provider>;
}

export function useAutosaveRegistry() {
  const ctx = useContext(AutosaveContext);
  if (!ctx) {
    throw new Error("useAutosaveRegistry must be used within AutosaveProvider");
  }
  return ctx;
}

export function autosaveLabel(status: AutosaveStatus): string | null {
  switch (status) {
    case "pending":
    case "saving":
      return "Saving draft…";
    case "saved":
      return "Draft saved";
    case "error":
      return "Autosave failed";
    default:
      return null;
  }
}
