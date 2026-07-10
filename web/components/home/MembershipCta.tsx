export default function MembershipCta() {
  return (
    <section className="bg-ifma-navy py-16 text-white">
      <div className="mx-auto max-w-4xl px-4 text-center">
        <h2 className="text-3xl font-semibold leading-tight md:text-4xl">
          Top-tier training, networking and benefits help you succeed in your
          career.
        </h2>
        <p className="mx-auto mt-6 max-w-3xl text-base leading-7 text-white/85">
          Whether you&apos;re looking for training and credentials to increase
          your authority in your career, or looking to grow your professional
          network and make life-long connections, IFMA is the global community
          dedicated to helping you achieve.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-4">
          <span className="inline-flex min-w-[150px] cursor-default items-center justify-center border-2 border-ifma-red bg-ifma-red px-6 py-3 text-sm font-semibold uppercase tracking-wide">
            Join Now
          </span>
          <span className="inline-flex min-w-[220px] cursor-default items-center justify-center border-2 border-white px-6 py-3 text-sm font-semibold uppercase tracking-wide">
            View Membership Benefits
          </span>
        </div>
      </div>
    </section>
  );
}
