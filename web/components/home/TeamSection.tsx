import { aboutCta, teamIntro, teamMembers } from "@/lib/data/home";

export default function TeamSection() {
  return (
    <section className="bg-ifma-surface py-16">
      <div className="mx-auto max-w-7xl px-4">
        <div className="text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ifma-blue">
            {teamIntro.eyebrow}
          </p>
          <h2 className="ifma-section-title mt-3 text-3xl font-semibold md:text-4xl">
            {teamIntro.title}
          </h2>
        </div>

        <div className="mt-10 flex flex-wrap justify-center gap-8">
          {teamMembers.map((member) => (
            <div key={member.name} className="w-56 text-center">
              <div className="mx-auto flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-ifma-navy to-ifma-blue text-2xl font-semibold text-white">
                {member.name
                  .split(" ")
                  .map((part) => part[0])
                  .join("")}
              </div>
              <h3 className="mt-4 text-lg font-semibold text-ifma-navy">
                {member.name}
              </h3>
              <p className="text-sm text-ifma-muted">{member.role}</p>
            </div>
          ))}
        </div>

        <div className="mx-auto mt-16 max-w-3xl rounded border border-ifma-border-light bg-white p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-ifma-blue">
            About Us
          </p>
          <h3 className="ifma-section-title mt-3 text-2xl font-semibold md:text-3xl">
            {aboutCta.title}
          </h3>
          <p className="mt-4 text-base leading-7 text-ifma-muted">
            {aboutCta.description}
          </p>
          <span className="mt-6 inline-flex cursor-default border-2 border-ifma-red bg-ifma-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white">
            {aboutCta.cta}
          </span>
        </div>
      </div>
    </section>
  );
}
