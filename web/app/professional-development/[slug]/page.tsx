import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CertificateProgramPageContent from "@/components/professional-development/CertificateProgramPageContent";
import { fetchPublishedCourseBySlug, type Course } from "@/lib/api";
import { courseShortSummary } from "@/lib/courseSummary";
import { getServerT } from "@/lib/i18n/server";

type CertificatePageProps = {
  params: Promise<{ slug: string }>;
};

async function loadCourse(slug: string): Promise<Course | null> {
  try {
    return await fetchPublishedCourseBySlug(slug);
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: CertificatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getServerT();
  const fallbackTitle = t("Certificate Program | CAISBE", "Programme de certificat | CAISBE");
  const course = await loadCourse(slug);
  if (!course) {
    return { title: fallbackTitle };
  }
  return {
    title: `${course.title} | CAISBE`,
    description: courseShortSummary(course.description),
  };
}

export default async function CertificateProgramPage({
  params,
}: CertificatePageProps) {
  const { slug } = await params;
  const course = await loadCourse(slug);

  if (!course) {
    notFound();
  }

  return <CertificateProgramPageContent course={course} />;
}
