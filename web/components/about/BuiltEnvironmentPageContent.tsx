import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero } from "@/components/pages/ContentPage";
import { aboutContent } from "@/lib/data/about";

export default function BuiltEnvironmentPageContent() {
  const { builtEnvironment } = aboutContent;

  return (
    <PageHero
      eyebrow="About CAISBE"
      title={builtEnvironment.title}
      actions={
        <>
          <ButtonLink href="/about" variant="secondary">
            Back to About
          </ButtonLink>
          <ButtonLink href="/contact" variant="primary">
            Contact Us
          </ButtonLink>
        </>
      }
    >
      {builtEnvironment.paragraphs.map((paragraph) => (
        <p
          key={paragraph.slice(0, 48)}
          className="mt-6 text-base leading-7 text-caisbe-muted"
        >
          {paragraph}
        </p>
      ))}
    </PageHero>
  );
}
