import ButtonLink from "@/components/ui/ButtonLink";
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
    builtEnvironment,
  } = aboutContent;

  return (
    <>
      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {eyebrow}
          </p>
          <p className="mt-4 text-sm font-semibold uppercase tracking-[0.2em] text-caisbe-green">
            {primaryTagline}
          </p>
          <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
            {title}
          </h1>
          <p className="mt-3 text-lg font-medium text-caisbe-text">
            {programTagline}
          </p>
          <p className="mt-6 text-base leading-7 text-caisbe-muted">{intro}</p>
        </div>
      </section>

      <section
        id="mission"
        className="scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="brand-section-title text-3xl font-semibold">
            {mission.title}
          </h2>
          <p className="mt-6 text-base leading-7 text-caisbe-muted">
            {mission.body}
          </p>
        </div>
      </section>

      <section
        id="vision"
        className="scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="brand-section-title text-3xl font-semibold">
            {vision.title}
          </h2>
          <p className="mt-6 text-base leading-7 text-caisbe-muted">
            {vision.body}
          </p>
        </div>
      </section>

      <section
        id="what-we-do"
        className="scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="brand-section-title text-3xl font-semibold">
            {whatWeDo.title}
          </h2>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {whatWeDo.items.map((item) => (
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
        id="leadership"
        className="scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20"
      >
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <h2 className="brand-section-title text-3xl font-semibold">
              {leadership.title}
            </h2>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {leadership.roles.map((role) => (
              <article
                key={role.title}
                className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white p-6"
              >
                <h3 className="text-lg font-semibold text-caisbe-green">
                  {role.title}
                </h3>
                <p className="mt-3 text-sm italic leading-6 text-caisbe-muted">
                  {role.bio}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-4xl px-4 text-center">
          <h2 className="brand-section-title text-2xl font-semibold">
            {builtEnvironment.title}
          </h2>
          <p className="mt-4 text-base leading-7 text-caisbe-muted">
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
      </section>
    </>
  );
}
