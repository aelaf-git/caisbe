export default function Skeleton({ className = "" }: { className?: string }) {
  return <div aria-hidden className={`animate-pulse rounded-md bg-ifma-border-light ${className}`} />;
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-label="Loading">
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-full max-w-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <Skeleton key={item} className="h-28" />
        ))}
      </div>
      <Skeleton className="h-72 w-full" />
    </div>
  );
}
