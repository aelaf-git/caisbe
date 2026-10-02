import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CertificateProgramPageContent from "@/components/professional-development/CertificateProgramPageContent";
import { fetchPublishedCourses } from "@/lib/api";

type CertificatePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CertificatePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const courses = await fetchPublishedCourses();
    const course = courses.find((item) => item.slug === slug);
    if (!course) {
      return { title: "Certificate Program | CAISBE" };
    }
    return {
      title: `${course.title} | CAISBE`,
      description: course.description || undefined,
    };
  } catch {
    return { title: "Certificate Program | CAISBE" };
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
