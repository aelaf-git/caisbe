import type { Metadata } from "next";
import { notFound } from "next/navigation";
import CertificateProgramPageContent from "@/components/professional-development/CertificateProgramPageContent";
import {
  getCertificateBySlug,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";

type CertificatePageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return professionalDevelopmentContent.certificates.map((certificate) => ({
    slug: certificate.slug,
  }));
}

export async function generateMetadata({
  params,
}: CertificatePageProps): Promise<Metadata> {
  const { slug } = await params;
  const certificate = getCertificateBySlug(slug);

  if (!certificate) {
    return { title: "Certificate Program | CAISBE" };
  }

  return {
    title: `${certificate.title} | CAISBE`,
    description: certificate.description,
  };
}

export default async function CertificateProgramPage({
  params,
}: CertificatePageProps) {
  const { slug } = await params;
  const certificate = getCertificateBySlug(slug);

  if (!certificate) {
    notFound();
  }

  return <CertificateProgramPageContent certificate={certificate} />;
}
