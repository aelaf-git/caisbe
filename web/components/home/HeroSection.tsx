import { heroCta, heroIntro, siteFullName, siteName } from "@/lib/data/home";

function HeroButton({
  children,
  variant = "primary",
}: {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  const styles =
    variant === "primary"
      ? "bg-ifma-red border-ifma-red text-white"
      : "bg-transparent border-white text-white";

  return (
    <span
      className={`inline-flex min-w-[150px] cursor-default items-center justify-center border-2 px-6 py-3 text-sm font-medium uppercase tracking-wide ${styles}`}
    >
      {children}
    </span>
  );
}

export default function HeroSection() {
  return (
    <section className="ifma-hero-bg relative overflow-hidden text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(33,134,185,0.35),transparent_55%)]" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 md:py-28">
        <h1 className="max-w-4xl text-[clamp(1.75rem,3.5vw,3.25rem)] font-semibold leading-tight">
          {siteFullName}
        </h1>
        <p className="mt-6 max-w-3xl text-[clamp(1rem,2vw,1.25rem)] leading-relaxed text-white/90">
          {heroIntro}
        </p>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/85">
          {heroCta}
        </p>
        <div className="mt-8 flex flex-wrap gap-4">
          <HeroButton>Join {siteName}</HeroButton>
          <HeroButton variant="secondary">Our Services</HeroButton>
          <HeroButton variant="secondary">Contact Us</HeroButton>
        </div>
      </div>
    </section>
  );
}
