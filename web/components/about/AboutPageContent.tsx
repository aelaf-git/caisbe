import ButtonLink from "@/components/ui/ButtonLink";
import {
  ContentSection,
  PageHero,
} from "@/components/pages/ContentPage";
import { aboutContent } from "@/lib/data/about";

export default function AboutPageContent() {
  const {
    primaryTagline,
    programTagline,
    eyebrow,
    title,
    intro,
    mission,
    vision,
    whatWeDo,
    leadership,
    advisoryCouncil,
    builtEnvironment,
  } = aboutContent;

  return (
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={programTagline}>
        <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-caisbe-red">
          {primaryTagline}
        </p>
        <p className="mt-6 text-base leading-8 text-caisbe-text md:text-lg">
          {intro}
        </p>
      </PageHero>

      <ContentSection
        id="mission"
        title={mission.title}
      >
        <p className="max-w-3xl text-base leading-8 text-caisbe-text md:text-lg">
          {mission.body}
        </p>
      </ContentSection>

      <ContentSection
        id="vision"
        title={vision.title}
        className="bg-[#fafafa]"
      >
        <p className="max-w-3xl text-base leading-8 text-caisbe-text md:text-lg">
          {vision.body}
        </p>
      </ContentSection>

      <ContentSection
        id="what-we-do"
        title={whatWeDo.title}
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {whatWeDo.items.map((item) => (
            <li
              key={item}
              className="flex min-h-14 w-full items-center rounded-[20px] border border-black/5 bg-white px-5 py-4 text-base font-semibold leading-7 text-caisbe-text-dark shadow-hopewell sm:text-lg sm:leading-8 sm:[&:last-child:nth-child(odd)]:col-span-2"
            >
              <span className="mr-2 inline-block h-2 w-2 rounded-full bg-caisbe-red align-middle" />
              {item}
            </li>
          ))}
        </ul>
      </ContentSection>

      <ContentSection
        id="leadership"
        title={leadership.title}
        description={leadership.intro}
        wide
      >
        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {leadership.people.map((person, index) => (
            <article
              key={person.email}
              className="flex flex-col rounded-[20px] bg-white p-6 shadow-hopewell motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-caisbe-red">
                {person.role}
              </p>
              <h3 className="font-hopewell-display mt-3 text-xl font-bold tracking-tight text-caisbe-text-dark">
                {person.name}
              </h3>
              <p className="mt-2 text-sm font-medium leading-6 text-caisbe-text">
                {person.credentials}
              </p>
              <a
                href={`mailto:${person.email}`}
                className="mt-5 text-sm font-semibold text-caisbe-red transition-colors hover:text-caisbe-red-dark"
              >
                {person.email}
              </a>
            </article>
          ))}
        </div>
      </ContentSection>

      <ContentSection
        id="advisory-council"
        title={advisoryCouncil.title}
        description={advisoryCouncil.intro}
        wide
        className="bg-[#fafafa]"
      >
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {advisoryCouncil.members.map((member, index) => (
            <article
              key={member.name}
              className="flex flex-col items-center rounded-[20px] bg-white p-5 shadow-hopewell text-center motion-safe:animate-page-fade-in"
              style={{ animationDelay: `${index * 60}ms` }}
            >
              <div
                aria-hidden={!member.logoSrc}
                className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-caisbe-red/30 bg-white"
              >
                {member.logoSrc ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={member.logoSrc}
                    alt=""
                    className="h-full w-full object-contain p-2"
                  />
                ) : (
                  <span className="font-hopewell-display text-sm font-bold tracking-wide text-caisbe-red">
                    {member.shortName}
                  </span>
                )}
              </div>
              <h3 className="font-hopewell-display mt-4 text-base font-bold leading-snug tracking-tight text-caisbe-text-dark">
                {member.name}
              </h3>
              <p className="mt-2 text-sm leading-6 text-caisbe-text">
                {member.description}
              </p>
            </article>
          ))}
        </div>
      </ContentSection>

      <ContentSection className="text-center">
        <div className="mx-auto max-w-2xl">
          <h2 className="font-hopewell-display text-caisbe-text-dark text-2xl font-extrabold tracking-tight md:text-3xl">
            {builtEnvironment.title}
          </h2>
          <p className="mt-4 text-base leading-8 text-caisbe-text">
            Learn how Facility Management shapes sustainable buildings and
            resilient communities across Africa and Canada.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <ButtonLink
              href={`/about/${builtEnvironment.slug}`}
              variant="primary"
            >
              Learn More
            </ButtonLink>
            <ButtonLink href="/contact" variant="secondary">
              Contact Us
            </ButtonLink>
          </div>
        </div>
      </ContentSection>
    </>
  );
}
