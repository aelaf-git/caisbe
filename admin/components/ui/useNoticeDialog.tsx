"use client";

import { useCallback, useRef, useState } from "react";
import NoticeDialog, { type NoticeTone } from "@/components/ui/NoticeDialog";

type NoticeOptions = {
  tone?: NoticeTone;
  title: string;
  description: string;
  confirmLabel?: string;
};

type PendingNotice = NoticeOptions & {
  resolve: () => void;
};

export function useNoticeDialog() {
  const [pending, setPending] = useState<PendingNotice | null>(null);
  const pendingRef = useRef<PendingNotice | null>(null);

  const notice = useCallback((options: NoticeOptions) => {
    return new Promise<void>((resolve) => {
      const next = { tone: "info" as NoticeTone, ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const close = useCallback(() => {
    const current = pendingRef.current;
    pendingRef.current = null;
    setPending(null);
    current?.resolve();
  }, []);

  const dialog = (
    <NoticeDialog
      open={Boolean(pending)}
      tone={pending?.tone ?? "info"}
      title={pending?.title ?? ""}
      description={pending?.description ?? ""}
      confirmLabel={pending?.confirmLabel}
      onClose={close}
    />
  );

  return { notice, dialog };
}
