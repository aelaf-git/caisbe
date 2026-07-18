"use client";

type ContactFormProps = {
  cta: string;
};

export default function ContactForm({ cta }: ContactFormProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="contact-name"
          className="mb-1 block text-sm font-medium text-caisbe-text"
        >
          Name
        </label>
        <input
          id="contact-name"
          name="name"
          type="text"
          placeholder="Enter your name"
          className="h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-green focus:ring-1 focus:ring-caisbe-green"
        />
      </div>

      <div>
        <label
          htmlFor="contact-email"
          className="mb-1 block text-sm font-medium text-caisbe-text"
        >
          Email
        </label>
        <input
          id="contact-email"
          name="email"
          type="email"
          placeholder="Enter your email address"
          className="h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-green focus:ring-1 focus:ring-caisbe-green"
        />
      </div>

      <div>
        <label
          htmlFor="contact-subject"
          className="mb-1 block text-sm font-medium text-caisbe-text"
        >
          Subject
        </label>
        <input
          id="contact-subject"
          name="subject"
          type="text"
          placeholder="Subject"
          className="h-12 w-full rounded-md border border-ifma-border bg-white px-4 text-sm text-caisbe-text outline-none focus:border-caisbe-green focus:ring-1 focus:ring-caisbe-green"
        />
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-1 block text-sm font-medium text-caisbe-text"
        >
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          placeholder="Message"
          className="w-full resize-y rounded-md border border-ifma-border bg-white px-4 py-3 text-sm text-caisbe-text outline-none focus:border-caisbe-green focus:ring-1 focus:ring-caisbe-green"
        />
      </div>

      <div className="pt-2 text-center">
        <button
          type="submit"
          className="inline-flex min-w-[180px] items-center justify-center rounded-md border-2 border-caisbe-green bg-caisbe-green px-8 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:bg-caisbe-green-mid"
        >
          {cta}
        </button>
      </div>
    </form>
  );
}
