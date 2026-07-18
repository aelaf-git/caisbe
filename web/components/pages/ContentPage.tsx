import ButtonLink from "@/components/ui/ButtonLink";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHero({ eyebrow, title, children, actions }: PageHeroProps) {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-4xl px-4">
        <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
          {eyebrow}
        </p>
        <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
          {title}
        </h1>
        {children}
        {actions ? <div className="mt-10 flex flex-wrap gap-4">{actions}</div> : null}
      </div>
    </section>
  );
}

type SubsectionIndexProps = {
  eyebrow: string;
  title: string;
  description?: string;
  items: { title: string; description?: string; href: string }[];
};

export function SubsectionIndex({
  eyebrow,
  title,
  description,
  items,
}: SubsectionIndexProps) {
  return (
    <section className="border-b border-ifma-border-light bg-white py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-4xl">
          <p className="brand-eyebrow text-sm font-semibold uppercase tracking-[0.25em]">
            {eyebrow}
          </p>
          <h1 className="brand-section-title mt-3 text-3xl font-semibold md:text-4xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-6 text-base leading-7 text-caisbe-muted">
              {description}
            </p>
          ) : null}
        </div>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {items.map((item) => (
            <article
              key={item.href}
              className="brand-card-shadow flex flex-col rounded-lg border border-ifma-border-light bg-white p-6"
            >
              <h2 className="text-xl font-semibold text-caisbe-green">
                {item.title}
              </h2>
              {item.description ? (
                <p className="mt-3 flex-1 text-sm leading-6 text-caisbe-muted">
                  {item.description}
                </p>
              ) : null}
              <ButtonLink href={item.href} variant="text" className="mt-6">
                Learn More
              </ButtonLink>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
