import {
  announcements,
  events,
  featuredJobs,
} from "@/lib/data/home";

function Column({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-ifma-border-light bg-white p-6">
      <h3 className="mb-5 border-b border-ifma-border-light pb-3 text-lg font-semibold uppercase tracking-wide text-ifma-navy">
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function LatestFromIfma() {
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <p className="mb-2 text-center text-sm font-semibold uppercase tracking-[0.3em] text-ifma-blue">
          The Latest From IFMA
        </p>
        <h2 className="ifma-section-title mb-10 text-center text-3xl font-semibold">
          Announcements, Events & Jobs
        </h2>

        <div className="grid gap-6 lg:grid-cols-3">
          <Column title="Announcements">
            <ul className="space-y-5">
              {announcements.map((item) => (
                <li key={item.title} className="border-l-4 border-ifma-blue pl-4">
                  <h4 className="text-base font-medium text-ifma-text-dark">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-sm text-ifma-muted">{item.date}</p>
                  <span className="mt-2 inline-block cursor-default text-sm font-semibold text-ifma-blue-bright">
                    Read More
                  </span>
                </li>
              ))}
            </ul>
          </Column>

          <Column title="Events">
            <ul className="space-y-5">
              {events.map((item) => (
                <li key={item.title} className="border-l-4 border-ifma-navy pl-4">
                  <h4 className="text-base font-medium text-ifma-text-dark">
                    {item.title}
                  </h4>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-ifma-red">
                    {item.date}
                  </p>
                  <span className="mt-2 inline-block cursor-default text-sm font-semibold text-ifma-blue-bright">
                    View Event
                  </span>
                </li>
              ))}
            </ul>
          </Column>

          <Column title="Featured Jobs">
            <ul className="space-y-4">
              {featuredJobs.map((job) => (
                <li
                  key={job}
                  className="flex items-center justify-between border-b border-ifma-border-light pb-3 last:border-b-0"
                >
                  <span className="text-sm font-medium text-ifma-text-dark">
                    {job}
                  </span>
                  <span className="cursor-default text-xs font-semibold uppercase tracking-wide text-ifma-blue">
                    View
                  </span>
                </li>
              ))}
            </ul>
          </Column>
        </div>
      </div>
    </section>
  );
}
