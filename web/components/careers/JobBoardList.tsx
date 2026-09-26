"use client";

import { useEffect, useState } from "react";
import ButtonLink from "@/components/ui/ButtonLink";
import { ContentCard, ContentSection } from "@/components/pages/ContentPage";
import { fetchActiveJobs, type JobPosting } from "@/lib/api";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function JobBoardList({
  title = "Open roles",
  limit,
}: {
  title?: string;
  limit?: number;
}) {
  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const data = await fetchActiveJobs();
        if (!cancelled) setJobs(limit ? data.slice(0, limit) : data);
      } catch {
        if (!cancelled) setError("Unable to load job listings right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return (
    <ContentSection
      id="job-board"
      title={title}
      description="Active postings with a future expiry date. Listings are removed automatically when their expiry date passes."
      wide
    >
      {loading ? (
        <p className="text-sm text-caisbe-muted">Loading jobs…</p>
      ) : null}
      {error ? <p className="text-sm text-caisbe-red">{error}</p> : null}
      {!loading && !error && jobs.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ifma-border bg-[#fafafa] px-6 py-12 text-center">
          <p className="text-base leading-7 text-caisbe-muted">
            No open roles right now. Check back soon, or contact CAISBE to post
            a vacancy.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-4">
            <ButtonLink href="/contact" variant="primary">
              Post a Job
            </ButtonLink>
            <ButtonLink href="/careers/jobs" variant="secondary">
              View Job Board
            </ButtonLink>
          </div>
        </div>
      ) : null}
      {!loading && jobs.length > 0 ? (
        <>
          <div className="grid gap-6 md:grid-cols-2">
            {jobs.map((job, index) => (
              <ContentCard
                key={job.id}
                title={job.title}
                meta={`${job.employment_type}${job.featured ? " · Featured" : ""}`}
                description={job.summary ?? undefined}
                href={job.apply_url || "/contact"}
                hrefLabel={job.apply_url ? "Apply / View" : "Inquire"}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <dl className="mt-4 space-y-1 text-sm text-caisbe-muted">
                  {job.company ? (
                    <div>
                      <dt className="inline font-semibold text-caisbe-text">
                        Company:{" "}
                      </dt>
                      <dd className="inline">{job.company}</dd>
                    </div>
                  ) : null}
                  {job.location ? (
                    <div>
                      <dt className="inline font-semibold text-caisbe-text">
                        Location:{" "}
                      </dt>
                      <dd className="inline">{job.location}</dd>
                    </div>
                  ) : null}
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      Posted:{" "}
                    </dt>
                    <dd className="inline">{formatDate(job.posted_on)}</dd>
                  </div>
                  <div>
                    <dt className="inline font-semibold text-caisbe-text">
                      Expires:{" "}
                    </dt>
                    <dd className="inline">{formatDate(job.expires_on)}</dd>
                  </div>
                  {job.source_label ? (
                    <div>
                      <dt className="inline font-semibold text-caisbe-text">
                        Source:{" "}
                      </dt>
                      <dd className="inline capitalize">{job.source_label}</dd>
                    </div>
                  ) : null}
                </dl>
                {job.attachment_url ? (
                  <a
                    href={job.attachment_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark"
                  >
                    Download posting
                  </a>
                ) : null}
              </ContentCard>
            ))}
          </div>
          {limit ? (
            <div className="mt-8">
              <ButtonLink href="/careers/jobs" variant="primary">
                View All Jobs
              </ButtonLink>
            </div>
          ) : null}
        </>
      ) : null}
    </ContentSection>
  );
}
