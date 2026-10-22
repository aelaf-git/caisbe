import { Suspense } from "react";
import SeminarManageClient from "@/components/seminars/SeminarManageClient";

export default async function SeminarManagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const seminarId = Number(id);
  return (
    <Suspense fallback={<p className="px-4 py-10 text-sm text-caisbe-muted">Loading…</p>}>
      <SeminarManageClient seminarId={Number.isFinite(seminarId) ? seminarId : 0} />
    </Suspense>
  );
}
