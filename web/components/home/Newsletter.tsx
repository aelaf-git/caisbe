export default function Newsletter() {
  return (
    <section className="border-t border-ifma-border-light bg-ifma-surface py-14">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="ifma-section-title text-2xl font-semibold">
          Sign up for our newsletter
        </h2>
        <p className="mt-3 text-sm leading-6 text-ifma-muted">
          Stay updated with industry research, content and trends delivered
          monthly right to your inbox.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <div className="h-12 min-w-[280px] border border-ifma-border bg-white px-4 text-left text-sm leading-[3rem] text-ifma-muted">
            Email address
          </div>
          <span className="inline-flex h-12 cursor-default items-center justify-center bg-ifma-navy px-8 text-sm font-semibold uppercase tracking-wide text-white">
            Subscribe
          </span>
        </div>
      </div>
    </section>
  );
}
