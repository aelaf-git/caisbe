"use client";

import { useEffect, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentCard, ContentSection } from "@/components/pages/ContentPage";
import { fetchActiveJobs, type JobPosting } from "@/lib/api";
import { useLocale } from "@/lib/i18n/LocaleProvider";

function formatDate(iso: string, locale: string) {
  return new Date(iso).toLocaleDateString(locale === "fr" ? "fr-CA" : "en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function JobBoardList({
  title,
  limit,
}: {
  title?: string;
  limit?: number;
}) {
  const locale = useLocale();
  const fr = locale === "fr";
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchActiveJobs({ locale });
        if (!cancelled) {
          setTotal(data.length);
          setJobs(limit ? data.slice(0, limit) : data);
        }
      } catch {
        if (!cancelled) setError(fr ? "Impossible de charger les offres d’emploi pour le moment." : "Unable to load job listings right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit, locale]);

  return (
    <ContentSection id="job-board" title={title} wide>
      {loading ? (
        <p className="text-sm text-caisbe-muted">{fr ? "Chargement des offres…" : "Loading jobs…"}</p>
      ) : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {!loading && !error && jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ifma-border bg-[#fafafa] px-6 py-12 text-center">
          <p className="text-base leading-7 text-caisbe-muted">
            {fr
              ? "Aucun poste ouvert pour le moment. Revenez bientôt pour de nouvelles offres du CAISBE."
              : "No open roles right now. Check back soon for new postings from CAISBE."}
          </p>
        </div>
      ) : null}
      {!loading && jobs.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job, index) => (
              <ContentCard
                key={job.id}
                title={job.title}
                meta={`${job.employment_type}${job.featured ? (fr ? " · En vedette" : " · Featured") : ""}`}
                description={job.summary ?? undefined}
                href={job.apply_url || "/contact"}
                hrefLabel={job.apply_url ? (fr ? "Postuler / Voir" : "Apply / View") : fr ? "Se renseigner" : "Inquire"}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <dl className="mt-4 space-y-1 text-sm text-caisbe-muted">
                  {job.company ? (
                    <div>
                      <dt className="inline font-semibold text-caisbe-text">
                        {fr ? "Entreprise : " : "Company: "}
                      </dt>
                      <dd className="inline">{job.company}</dd>
                    </div>
                  ) : null}
                  {job.location ? (
                    <div>
                      <dt className="inline font-semibold text-caisbe-text">
                        {fr ? "Lieu : " : "Location: "}
                      </dt>
                      <dd className="inline">{job.location}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      {fr ? "Publié le : " : "Posted: "}
                    </dt>
                    <dd className="inline">{formatDate(job.posted_on, locale)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      {fr ? "Expire le : " : "Expires: "}
                    </dt>
                    <dd className="inline">{formatDate(job.expires_on, locale)}</dd>
                  </div>
                </dl>
                {job.attachment_url ? (
                  <a
                    href={job.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark"
                  >
                    {fr ? "Télécharger l’offre" : "Download posting"}
                  </a>
                ) : null}
              </ContentCard>
            ))}
          </div>
          {limit && total > jobs.length ? (
            <div className="mt-8">
              <ButtonLink href="/careers/jobs" variant="primary">
                {fr ? "Voir toutes les offres" : "View All Jobs"}
              </ButtonLink>
            </div>
          ) : null}
        </>
      ) : null}
    </ContentSection>
  );
}
