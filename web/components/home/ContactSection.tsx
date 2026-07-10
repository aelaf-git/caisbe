import { contactContent } from "@/lib/data/home";

export default function ContactSection() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <p className="text-center text-sm font-semibold uppercase tracking-[0.25em] text-ifma-blue">
          {contactContent.eyebrow}
        </p>
        <h2 className="ifma-section-title mt-3 text-center text-3xl font-semibold">
          {contactContent.title}
        </h2>

        <div className="mt-10 space-y-4">
          {contactContent.fields.map((placeholder) => (
            <div
              key={placeholder}
              className={`border border-ifma-border bg-ifma-surface px-4 text-sm text-ifma-muted ${
                placeholder === "Message" ? "h-32 py-3" : "h-12 leading-[3rem]"
              }`}
            >
              {placeholder}
            </div>
          ))}
        </div>

        <div className="mt-6 text-center">
          <span className="inline-flex min-w-[180px] cursor-default items-center justify-center bg-ifma-navy px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white">
            {contactContent.cta}
          </span>
        </div>
      </div>
    </section>
  );
}
