import BackButton from "@/components/ui/BackButton";
import ButtonLink from "@/components/ui/ButtonLink";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  lead?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
};

export function PageHero({
  eyebrow,
  title,
  lead,
  children,
  actions,
  backHref,
  backLabel = "Go back",
  className = "",
}: PageHeroProps) {
  return (
    <section className={`relative overflow-hidden bg-[#f8fafc] py-16 md:py-24 ${className}`}>
      <div className="relative mx-auto max-w-7xl px-4 motion-safe:animate-page-fade-in">
        {backHref ? (
          <div className="mb-8">
            <BackButton href={backHref} label={backLabel} />
          </div>
        ) : null}
        <p className="inline-flex rounded-full bg-caisbe-red/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-caisbe-red-dark">
          {eyebrow}
        </p>
        <h1 className="font-hopewell-display mt-4 max-w-3xl text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
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
      className={`scroll-mt-28 bg-transparent py-16 md:py-24 ${className}`}
    >
      <div className="mx-auto max-w-7xl px-4">
        {title ? (
          <h2 className="font-hopewell-display max-w-3xl text-3xl font-extrabold tracking-tight text-caisbe-text-dark md:text-4xl">
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
      className={`flex flex-col rounded-[20px] bg-white p-6 shadow-hopewell transition duration-300 hover:-translate-y-1 motion-safe:animate-page-fade-in ${className}`}
    >
      {meta ? (
        <p className="text-xs font-semibold uppercase tracking-wider text-caisbe-red">
          {meta}
        </p>
      ) : null}
      <h3
        className={`font-hopewell-display text-xl font-bold text-caisbe-text-dark ${meta ? "mt-2" : ""}`}
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
