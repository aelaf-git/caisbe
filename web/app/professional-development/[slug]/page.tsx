import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CertificateProgramPageContent from "@/components/professional-development/CertificateProgramPageContent";
import { fetchPublishedCourses } from "@/lib/api";
import { courseShortSummary } from "@/lib/courseSummary";
import { getServerT } from "@/lib/i18n/server";

type CertificatePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CertificatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const { t } = await getServerT();
  const fallbackTitle = t("Certificate Program | CAISBE", "Programme de certificat | CAISBE");
  try {
    const courses = await fetchPublishedCourses();
    const course = courses.find((item) => item.slug === slug);
    if (!course) {
      return { title: fallbackTitle };
    }
    return {
      title: `${course.title} | CAISBE`,
      description: courseShortSummary(course.description),
    };
  } catch {
    return { title: fallbackTitle };
  }
}

export default async function CertificateProgramPage({
  params,
}: CertificatePageProps) {
  const { slug } = await params;
  let course = null;
  try {
    const courses = await fetchPublishedCourses();
    course = courses.find((item) => item.slug === slug) ?? null;
  } catch {
    course = null;
  }

  if (!course) {
    notFound();
  }

  return <CertificateProgramPageContent course={course} />;
}
