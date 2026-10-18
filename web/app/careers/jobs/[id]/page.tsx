import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentSection, PageHero } from "@/components/pages/ContentPage";
import { fetchJob } from "@/lib/api";
import { getServerT } from "@/lib/i18n/server";

type PageProps = {
  params: Promise<{ id: string }>;
};

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const jobId = Number(id);
  const { t } = await getServerT();
  if (!Number.isFinite(jobId)) {
    return { title: t("Job | CAISBE", "Offre | CAISBE") };
  }
  try {
    const job = await fetchJob(jobId);
    return {
      title: `${job.title} | ${t("CAISBE Careers", "Carrières du CAISBE")}`,
      description: job.summary ?? job.title,
    };
  } catch {
    return { title: t("Job | CAISBE", "Offre | CAISBE") };
  }
}

export default async function JobDetailPage({ params }: PageProps) {
  const { id } = await params;
  const jobId = Number(id);
  const { t, locale } = await getServerT();
  if (!Number.isFinite(jobId)) {
    notFound();
  }

  let job;
  try {
    job = await fetchJob(jobId, locale);
  } catch {
    notFound();
  }

  const body = (job.description || job.summary || "").trim();
  const applyHref = job.apply_url || "/contact";
  const applyLabel = job.apply_url
    ? t("Apply now", "Postuler")
    : t("Inquire", "Se renseigner");

  return (
    <>
      <PageHero
        eyebrow={t("Careers & Job Board", "Carrières et offres d’emploi")}
        title={job.title}
        lead={job.summary ?? undefined}
        backHref="/careers/jobs"
        backLabel={t("Back to all jobs", "Retour aux offres")}
        actions={
          <>
            <ButtonLink href={applyHref} variant="primary">
              {applyLabel}
            </ButtonLink>
            <ButtonLink href="/careers" variant="secondary">
              {t("Careers home", "Accueil carrières")}
            </ButtonLink>
          </>
        }
      >
        <dl className="mt-6 space-y-1 text-sm text-caisbe-muted">
          {job.company ? (
            <div>
              <dt className="inline font-semibold text-caisbe-text">
                {t("Company: ", "Entreprise : ")}
              </dt>
              <dd className="inline">{job.company}</dd>
            </div>
          ) : null}
          {job.location ? (
            <div>
              <dt className="inline font-semibold text-caisbe-text">
                {t("Location: ", "Lieu : ")}
              </dt>
              <dd className="inline">{job.location}</dd>
            </div>
          ) : null}
          <div>
            <dt className="inline font-semibold text-caisbe-text">
              {t("Type: ", "Type : ")}
            </dt>
            <dd className="inline">{job.employment_type}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-caisbe-text">
              {t("Posted: ", "Publié le : ")}
            </dt>
            <dd className="inline">{formatDate(job.posted_on, locale)}</dd>
          </div>
          <div>
            <dt className="inline font-semibold text-caisbe-text">
              {t("Expires: ", "Expire le : ")}
            </dt>
            <dd className="inline">{formatDate(job.expires_on, locale)}</dd>
          </div>
        </dl>
      </PageHero>

      <ContentSection title={t("Job details", "Détails du poste")}>
        {body ? (
          <div className="max-w-3xl space-y-4 text-base leading-8 text-caisbe-text whitespace-pre-wrap">
            {body}
          </div>
        ) : (
          <p className="text-base leading-8 text-caisbe-muted">
            {t(
              "Full details are available via the application link.",
              "Les détails complets sont disponibles via le lien de candidature.",
            )}
          </p>
        )}
        {job.attachment_url ? (
          <a
            href={job.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-8 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark"
          >
            {t("Download posting", "Télécharger l’offre")}
          </a>
        ) : null}
        <div className="mt-10">
          <ButtonLink href={applyHref} variant="primary">
            {applyLabel}
          </ButtonLink>
        </div>
      </ContentSection>
    </>
  );
}
