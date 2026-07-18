import ButtonLink from "@/components/ui/ButtonLink";
import { learningFormatsPath } from "@/lib/data/professional-development";

type LearningFormatPageContentProps = {
  title: string;
  description: string;
};

export default function LearningFormatPageContent({
  title,
  description,
}: LearningFormatPageContentProps) {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
          Learning Formats
        </p>
        <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
          {title}
        </h1>
        <p className="mt-6 text-base leading-7 text-caisbe-muted">
          {description}
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/contact" variant="primary">
            Contact Us
          </ButtonLink>
          <ButtonLink href={learningFormatsPath()} variant="secondary">
            All Learning Formats
          </ButtonLink>
          <ButtonLink href="/professional-development" variant="text">
            Certificate Programs
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
