import ButtonLink from "@/components/ui/ButtonLink";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
};

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  actions,
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-ifma-border-light bg-[linear-gradient(135deg,#ffffff_0%,#fafafa_45%,#fff5f6_100%)] py-16 md:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(196,32,50,0.08),transparent_55%)]"
      />
      <div className="relative mx-auto max-w-7xl px-4 motion-safe:animate-page-fade-in">
        <p className="text-caisbe-red text-sm font-semibold uppercase tracking-[0.25em]">
          {eyebrow}
        </p>
        <h1 className="font-display text-caisbe-text-dark mt-3 max-w-3xl text-3xl font-semibold md:text-4xl">
          {title}
        </h1>
        {lead ? (
          <p className="mt-6 max-w-2xl text-lg leading-8 text-caisbe-text">
            {lead}
          </p>
        ) : null}
        {children}
        {actions ? (
          <div className="mt-10 flex flex-wrap items-center gap-4">{actions}</div>
        ) : null}
      </div>
    </section>
  );
}

type ContentSectionProps = {
  id?: string;
  title?: string;
  description?: string;
  children: React.ReactNode;
  /** @deprecated All sections use the shared max-w-7xl site shell. Kept for call-site compatibility. */
  wide?: boolean;
  className?: string;
};

export function ContentSection({
  id,
  title,
  description,
  children,
  wide: _wide = false,
  className = "",
}: ContentSectionProps) {
  void _wide;
  return (
    <section
      id={id}
      className={`scroll-mt-28 border-b border-ifma-border-light bg-white py-16 md:py-20 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4">
        {title ? (
          <h2 className="font-display text-caisbe-text-dark max-w-3xl text-2xl font-semibold md:text-3xl">
            {title}
          </h2>
        ) : null}
        {description ? (
          <p className="mt-4 max-w-3xl text-base leading-8 text-caisbe-text">
            {description}
          </p>
        ) : null}
        <div className={title || description ? "mt-8" : undefined}>
          {children}
        </div>
      </div>
    </section>
  );
}

type ContentCardProps = {
  title: string;
  description?: string;
  meta?: string;
  href?: string;
  hrefLabel?: string;
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
};

export function ContentCard({
  title,
  description,
  meta,
  href,
  hrefLabel = "Learn More",
  children,
  className = "",
  style,
}: ContentCardProps) {
  return (
    <article
      style={style}
      className={`shadow-brand-card flex flex-col rounded-lg border border-ifma-border-light bg-white p-6 transition-colors hover:border-caisbe-red/40 motion-safe:animate-page-fade-in ${className}`}
    >
      {meta ? (
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-caisbe-red">
          {meta}
        </p>
      ) : null}
      <h3
        className={`text-xl font-semibold text-caisbe-text-dark ${meta ? "mt-2" : ""}`}
      >
        {title}
      </h3>
      {description ? (
        <p className="mt-3 flex-1 text-sm leading-7 text-caisbe-text">
          {description}
        </p>
      ) : null}
      {children}
      {href ? (
        <ButtonLink href={href} variant="text" className="mt-6">
          {hrefLabel}
        </ButtonLink>
      ) : null}
    </article>
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
    <>
      <PageHero eyebrow={eyebrow} title={title} lead={description} />
      <ContentSection wide>
        <div className="grid gap-6 md:grid-cols-2">
          {items.map((item, index) => (
            <ContentCard
              key={item.href}
              title={item.title}
              description={item.description}
              href={item.href}
              style={{ animationDelay: `${index * 60}ms` }}
            />
          ))}
        </div>
      </ContentSection>
    </>
  );
}
