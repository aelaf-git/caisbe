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
      <div className="relative mx-auto max-w-7xl px-4 py-24 md:py-32">
        <div className="max-w-3xl">
          <h1 className="hero-title text-[clamp(2rem,4vw,4rem)] font-light leading-tight">
            Unlock your potential.
            <br />
            <span className="font-semibold">Advance your career.</span>
          </h1>
          <p className="mt-6 max-w-2xl text-[clamp(1rem,2vw,1.375rem)] leading-relaxed text-white/90">
            Connect with other facility professionals, learn from experts and
            grow your network and career.
          </p>
          <div className="hero-button-container mt-8 flex flex-wrap gap-4">
            <HeroButton>Join Today</HeroButton>
            <HeroButton variant="secondary">Membership Benefits</HeroButton>
          </div>
          <p className="hero-extra mt-6 text-xs uppercase tracking-[0.2em] text-white/75">
            Already a member?{" "}
            <span className="underline decoration-white/50">Manage your account</span>
          </p>
        </div>
      </div>
    </section>
  );
}
