import Link from "next/link";

type PlaceholderPageProps = {
  title: string;
  description: string;
};

export default function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-caisbe-text-dark">{title}</h1>
        <p className="mt-2 text-sm text-caisbe-muted">{description}</p>
      </div>
      <div className="border border-ifma-border bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-caisbe-red">Coming soon</p>
        <p className="mt-2 text-sm text-caisbe-muted">
          This section is not available yet. You can keep building courses in the meantime.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center border-2 border-ifma-border bg-white px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-caisbe-text hover:border-caisbe-green hover:text-caisbe-green"
          >
            Dashboard
          </Link>
          <Link
            href="/courses"
            className="inline-flex items-center justify-center border-2 border-caisbe-green bg-caisbe-green px-5 py-2.5 text-sm font-semibold uppercase tracking-wide text-white hover:bg-caisbe-green-mid"
          >
            All courses
          </Link>
        </div>
      </div>
    </div>
  );
}
