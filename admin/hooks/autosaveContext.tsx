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

/** Pick a subset of autosave units by id. */
export type UnitMatch = (id: string) => boolean;

type AutosaveContextValue = {
  register: (id: string, flush: FlushFn) => void;
  unregister: (id: string) => void;
  flushAll: () => Promise<void>;
  /** Flush only the units whose id matches. */
  flushWhere: (match: UnitMatch) => Promise<void>;
  setUnitStatus: (id: string, status: AutosaveStatus) => void;
  overallStatus: AutosaveStatus;
  /** Aggregate status of the units whose id matches. */
  statusFor: (match: UnitMatch) => AutosaveStatus;
  /** Status of every registered unit, keyed by id. */
  unitStatuses: Record<string, AutosaveStatus>;
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

  const flushWhere = useCallback(async (match: UnitMatch) => {
    const tasks = [...flushes.current.entries()]
      .filter(([id]) => match(id))
      .map(([, flush]) => flush());
    await Promise.all(tasks);
  }, []);

  const setUnitStatus = useCallback((id: string, status: AutosaveStatus) => {
    setUnitStatuses((prev) => (prev[id] === status ? prev : { ...prev, [id]: status }));
  }, []);

  const overallStatus = useMemo(
    () => aggregate(Object.values(unitStatuses)),
    [unitStatuses],
  );

  const statusFor = useCallback(
    (match: UnitMatch) =>
      aggregate(
        Object.entries(unitStatuses)
          .filter(([id]) => match(id))
          .map(([, status]) => status),
      ),
    [unitStatuses],
  );

  const value = useMemo(
    () => ({
      register,
      unregister,
      flushAll,
      flushWhere,
      setUnitStatus,
      overallStatus,
      statusFor,
      unitStatuses,
    }),
    [register, unregister, flushAll, flushWhere, setUnitStatus, overallStatus, statusFor, unitStatuses],
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

/** Unit id used by the Course info section; every other unit belongs to Lessons and exam. */
export function isCourseInfoUnit(id: string): boolean {
  return /^course-\d+-meta$/.test(id);
}

export function isContentUnit(id: string): boolean {
  return !isCourseInfoUnit(id);
}

export function autosaveLabel(
  status: AutosaveStatus,
  options?: { published?: boolean; hasUnpublishedChanges?: boolean },
): string | null {
  const published = Boolean(options?.published);
  switch (status) {
    case "pending":
    case "saving":
      return "Saving draft…";
    case "saved":
      if (published && options?.hasUnpublishedChanges) {
        return "Draft saved — publish changes to update what students see";
      }
      if (published) {
        return "Students see the latest version";
      }
      return "Draft saved";
    case "error":
      return "Autosave failed";
    default:
      if (published && options?.hasUnpublishedChanges) {
        return "Unpublished edits — publish changes to update what students see";
      }
      return null;
  }
}
