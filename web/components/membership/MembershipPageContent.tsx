import ButtonLink from "@/components/ui/ButtonLink";
import { PageHero, SubsectionIndex } from "@/components/pages/ContentPage";
import {
  membershipIndexItems,
  membershipPages,
  type MembershipSlug,
} from "@/lib/data/membership";

export function MembershipIndexContent() {
  return (
    <SubsectionIndex
      eyebrow="Membership"
      title="Membership"
      description="Join CAISBE for professional benefits, community, and pathways into facility management excellence."
      items={membershipIndexItems}
    />
  );
}

export function MembershipSubpageContent({ slug }: { slug: MembershipSlug }) {
  if (slug === "overview") {
    const page = membershipPages.overview;
    return (
      <PageHero eyebrow="Membership" title={page.title}>
        {page.paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="mt-6 text-base leading-7 text-caisbe-muted"
          >
            {paragraph}
          </p>
        ))}
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/membership/join" variant="primary">
            Join / Register
          </ButtonLink>
          <ButtonLink href="/membership/types" variant="secondary">
            Membership Types
          </ButtonLink>
        </div>
      </PageHero>
    );
  }

  if (slug === "join") {
    const page = membershipPages.join;
    return (
      <PageHero eyebrow={page.eyebrow} title={page.title}>
        {page.paragraphs.map((paragraph) => (
          <p
            key={paragraph.slice(0, 40)}
            className="mt-6 text-base leading-7 text-caisbe-muted"
          >
            {paragraph}
          </p>
        ))}
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/register" variant="primary">
            Register Today
          </ButtonLink>
          <ButtonLink href="/membership/become-a-member" variant="secondary">
            Become a Member
          </ButtonLink>
        </div>
      </PageHero>
    );
  }

  if (slug === "types") {
    const page = membershipPages.types;
    return (
      <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
        <div className="mx-auto max-w-7xl px-4">
          <div className="mx-auto max-w-4xl">
            <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
              {page.eyebrow}
            </p>
            <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
              {page.title}
            </h1>
          </div>
          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {page.items.map((item) => (
              <article
                key={item.title}
                className="brand-card-shadow rounded-lg border border-ifma-border-light bg-white p-6"
              >
                <h2 className="text-lg font-semibold text-caisbe-green">
                  {item.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-caisbe-muted">
                  {item.description}
                </p>
              </article>
            ))}
          </div>
          <div className="mt-10">
            <ButtonLink href="/membership/become-a-member" variant="primary">
              Become a Member
            </ButtonLink>
          </div>
        </div>
      </section>
    );
  }

  const page = membershipPages["become-a-member"];
  return (
    <PageHero
      eyebrow="Membership"
      title={page.title}
      actions={
        <>
          <ButtonLink href={page.joinHref} variant="primary">
            {page.joinLabel}
          </ButtonLink>
          <ButtonLink href={page.renewHref} variant="secondary">
            {page.renewLabel}
          </ButtonLink>
        </>
      }
    >
      <p className="mt-6 text-base leading-7 text-caisbe-muted">
        {page.description}
      </p>
    </PageHero>
  );
}
