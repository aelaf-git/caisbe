export default function ProgressBar({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={`h-2 overflow-hidden rounded-full bg-ifma-border-light ${className}`}>
      <div className="h-full rounded-full bg-caisbe-red transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}
