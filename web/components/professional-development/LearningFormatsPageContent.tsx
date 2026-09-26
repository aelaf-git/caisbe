import {
  ContentCard,
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import {
  learningFormatPath,
  professionalDevelopmentContent,
} from "@/lib/data/professional-development";

export default function LearningFormatsPageContent() {
  const { formats } = professionalDevelopmentContent;

  return (
    <>
      <PageHero
        eyebrow="Professional Development"
        title={formats.title}
        lead={formats.description}
        backHref="/professional-development"
        backLabel="Back to certificate programs"
      />
      <ContentSection wide>
        <div className="grid gap-6 sm:grid-cols-2">
          {formats.items.map((format, index) => (
            <ContentCard
              key={format.slug}
              title={format.title}
              description={format.description}
              href={learningFormatPath(format.slug)}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>
    </>
  );
}
