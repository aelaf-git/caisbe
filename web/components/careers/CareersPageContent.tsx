import ButtonLink from "@/components/ui/ButtonLink";
import { careersContent } from "@/lib/data/careers";

export default function CareersPageContent() {
  const { title, intro, jobBoard, careerResources, employers, eyebrow } =
    careersContent;

  return (
    <>
      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {eyebrow}
          </p>
          <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
            {title}
          </h1>
          <p className="mt-6 text-base leading-7 text-caisbe-muted">{intro}</p>
        </div>
      </section>

      <section
        id="job-board"
        className="scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="brand-section-title text-3xl font-semibold">
            {jobBoard.title}
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {jobBoard.roles.map((role) => (
              <li
                key={role}
                className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-green"
              >
                {role}
              </li>
            ))}
          </ul>
          <div className="mt-8">
            <ButtonLink href={jobBoard.ctaHref} variant="primary">
              {jobBoard.ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </section>

      <section
        id="career-resources"
        className="scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="brand-section-title text-3xl font-semibold">
            {careerResources.title}
          </h2>
          <ul className="mt-8 space-y-3">
            {careerResources.items.map((item) => (
              <li
                key={item}
                className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white px-4 py-3 text-sm font-medium text-caisbe-green"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section
        id="employers"
        className="scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="brand-section-title text-3xl font-semibold">
            {employers.title}
          </h2>
          <p className="mt-6 text-base leading-7 text-caisbe-muted">
            {employers.description}
          </p>
          <div className="mt-8">
            <ButtonLink href={employers.ctaHref} variant="secondary">
              {employers.ctaLabel}
            </ButtonLink>
          </div>
        </div>
      </section>
    </>
  );
}
