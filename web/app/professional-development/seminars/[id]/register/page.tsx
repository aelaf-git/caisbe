import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import SeminarRegistrationClient from "@/components/seminars/SeminarRegistrationClient";
import { fetchPublishedSeminar } from "@/lib/api";

type PageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const seminarId = Number(id);
  if (!Number.isFinite(seminarId)) {
    return { title: "Seminar registration | CAISBE" };
  }
  try {
    const seminar = await fetchPublishedSeminar(seminarId);
    return {
      title: `Register: ${seminar.title} | CAISBE`,
      description: seminar.description,
    };
  } catch {
    return { title: "Seminar registration | CAISBE" };
  }
}

export default async function SeminarRegisterPage({ params }: PageProps) {
  const { id } = await params;
  const seminarId = Number(id);
  if (!Number.isFinite(seminarId)) {
    notFound();
  }
  let seminar;
  try {
    seminar = await fetchPublishedSeminar(seminarId);
  } catch {
    notFound();
  }

  return (
    <Suspense fallback={<p className="p-8 text-sm text-caisbe-muted">Loading registration…</p>}>
      <SeminarRegistrationClient seminar={seminar} />
    </Suspense>
  );
}
