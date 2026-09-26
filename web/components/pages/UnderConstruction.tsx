import BackButton from "@/components/ui/BackButton";
import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero, ContentSection, ContentCard } from "@/components/pages/ContentPage";
import { siteName } from "@/lib/data/home";

type UnderConstructionProps = {
  title: string;
};

const hubs = [
  {
    title: "Membership",
    description: "Join CAISBE and access professional networks, events, and development.",
    href: "/membership",
  },
  {
    title: "Professional Development",
    description: "Explore certificate programs and learning formats for FM professionals.",
    href: "/professional-development",
  },
  {
    title: "Events",
    description: "Discover forums, conferences, and the Africa–Canada Built Environment Expo.",
    href: "/events",
  },
  {
    title: "Contact",
    description: "Reach our Canada and Africa offices with questions or partnership ideas.",
    href: "/contact",
  },
];

export default function UnderConstruction({ title }: UnderConstructionProps) {
  return (
    <>
      <PageHero
        eyebrow="Coming Soon"
        title={title}
        lead={`${siteName} is preparing this content. In the meantime, explore our active programs and get in touch.`}
        actions={
          <>
            <BackButton href="/" label="Back to home" />
            <ButtonLink href="/contact" variant="primary">
              Contact Us
            </ButtonLink>
            <ButtonLink href="/membership" variant="secondary">
              Membership
            </ButtonLink>
          </>
        }
      />
      <ContentSection
        title="While you wait"
        description="These areas of the site are ready now and can help you connect with CAISBE today."
        wide
      >
        <div className="grid gap-6 sm:grid-cols-2">
          {hubs.map((hub, index) => (
            <ContentCard
              key={hub.href}
              title={hub.title}
              description={hub.description}
              href={hub.href}
              style={{ animationDelay: `${index * 70}ms` }}
            />
          ))}
        </div>
      </ContentSection>
    </>
  );
}
