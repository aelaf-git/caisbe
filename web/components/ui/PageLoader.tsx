export default function PageLoader() {
  return (
    <div
      className="flex min-h-[50vh] flex-col items-center justify-center gap-5 px-4 py-20"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="relative h-12 w-12">
        <span className="absolute inset-0 rounded-full border-[3px] border-caisbe-red/15" />
        <span className="absolute inset-0 animate-spin rounded-full border-[3px] border-transparent border-t-caisbe-red" />
      </div>
      <p className="text-sm font-medium tracking-wide text-caisbe-muted">
        Loading…
      </p>
    </div>
  );
}
