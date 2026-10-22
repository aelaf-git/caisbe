import { Suspense } from "react";
import SeminarManageClient from "@/components/seminars/SeminarManageClient";

export default async function SeminarManagePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const resolved = await Promise.resolve(params);
  const seminarId = Number(resolved.id);
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-caisbe-muted">Loading…</p>}>
      <SeminarManageClient seminarId={Number.isFinite(seminarId) ? seminarId : 0} />
    </Suspense>
  );
}
