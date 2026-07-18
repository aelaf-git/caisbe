export default function PageLoader() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-4 py-20"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="relative h-12 w-12">
        <span className="page-loader-ring absolute inset-0 rounded-full border-[3px] border-caisbe-green/20" />
        <span className="page-loader-spin absolute inset-0 rounded-full border-[3px] border-transparent border-t-caisbe-green border-r-caisbe-red" />
      </div>
      <p className="text-sm font-medium tracking-wide text-caisbe-muted">
        Loading…
      </p>
    </div>
  );
}
