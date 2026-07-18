import ButtonLink from "@/components/ui/ButtonLink";
import {
  learningFormatPath,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";

export default function LearningFormatsPageContent() {
  const { formats } = professionalDevelopmentContent;

  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
          Professional Development
        </p>
        <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
          {formats.title}
        </h1>
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {formats.description}
        </p>

        <div className="mt-10 grid gap-6 sm:grid-cols-2">
          {formats.items.map((format) => (
            <article
              key={format.slug}
              className="brand-card-shadow flex flex-col rounded-lg border border-ifma-border-light bg-white p-6"
            >
              <h2 className="text-lg font-semibold text-caisbe-green">
                {format.title}
              </h2>
              <p className="mt-3 flex-1 text-sm leading-6 text-caisbe-muted">
                {format.description}
              </p>
              <ButtonLink
                href={learningFormatPath(format.slug)}
                variant="text"
                className="mt-6"
              >
                Learn More
              </ButtonLink>
            </article>
          ))}
        </div>

        <div className="mt-10">
          <ButtonLink href="/professional-development" variant="secondary">
            Back to Certificate Programs
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
