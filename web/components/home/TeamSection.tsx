import ButtonLink from "@/components/ui/ButtonLink";
import { aboutCta, teamIntro, teamMembers } from "@/lib/data/home";

export default function TeamSection() {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {teamIntro.eyebrow}
          </p>
          <h2 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
            {teamIntro.title}
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-8">
          {teamMembers.map((member) => (
            <div key={member.name} className="w-56 text-center">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full border-2 border-caisbe-green bg-white text-2xl font-semibold text-caisbe-green">
                {member.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-caisbe-green">
                {member.name}
              </h3>
              <p className="text-sm text-caisbe-muted">{member.role}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-3xl rounded-lg border border-ifma-border-light bg-white p-8 text-center">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            About Us
          </p>
          <h3 className="brand-section-title mt-3 text-2xl font-semibold md:text-3xl">
            {aboutCta.title}
          </h3>
          <p className="mt-4 text-base leading-7 text-caisbe-muted">
            {aboutCta.description}
          </p>
          <ButtonLink href="/projects" variant="red" className="mt-6">
            {aboutCta.cta}
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
