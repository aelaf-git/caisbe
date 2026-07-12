import ButtonLink from "@/components/ui/ButtonLink";
import { heroCta, heroIntro, siteFullName, siteName } from "@/lib/data/home";
import { linkPath } from "@/lib/routes";

export default function HeroSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4">
        <div className="max-w-4xl border-l-4 border-caisbe-red pl-6 md:pl-8">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {siteName}
          </p>
          <h1 className="mt-3 text-[clamp(1.75rem,3.5vw,3.25rem)] font-semibold leading-tight text-caisbe-green">
            {siteFullName}
          </h1>
          <p className="mt-6 max-w-3xl text-[clamp(1rem,2vw,1.125rem)] leading-relaxed text-caisbe-text">
            {heroIntro}
          </p>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-caisbe-muted">
            {heroCta}
          </p>
        </div>
        <div className="mt-8 flex flex-wrap gap-4">
          <ButtonLink href={linkPath("Join / Register", "Membership", "Membership")} variant="primary">
            Join {siteName}
          </ButtonLink>
          <ButtonLink href="/our-services" variant="secondary">
            Our Services
          </ButtonLink>
          <ButtonLink href="/contact" variant="secondary">
            Contact Us
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
