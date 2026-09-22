export default function MetricBars({
  items,
  active,
  onSelect,
}: {
  items: { label: string; views: number; detail?: string }[];
  active?: string | null;
  onSelect?: (label: string) => void;
}) {
  const max = Math.max(1, ...items.map((item) => item.views));

  if (items.length === 0) {
    return <p className="px-6 py-6 text-sm text-caisbe-muted">Nothing recorded in this range.</p>;
  }

  return (
    <ul className="divide-y divide-ifma-border-light">
      {items.map((item) => {
        const selected = active === item.label;
        const width = `${Math.max(4, Math.round((item.views / max) * 100))}%`;
        const content = (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="truncate font-medium text-caisbe-text">{item.label}</span>
              <span className="shrink-0 tabular-nums text-caisbe-muted">{item.detail ?? item.views}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ifma-border-light">
              <div className="h-full rounded-full bg-caisbe-red" style={{ width }} />
            </div>
          </>
        );
        return (
          <li key={item.label}>
            {onSelect ? (
              <button
                type="button"
                onClick={() => onSelect(item.label)}
                className={`w-full px-6 py-3 text-left text-sm transition-colors hover:bg-admin-surface-muted/60 ${
                  selected ? "bg-caisbe-red/5" : ""
                }`}
              >
                {content}
              </button>
            ) : (
              <div className="px-6 py-3 text-sm">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
