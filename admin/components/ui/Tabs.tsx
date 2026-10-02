type Tab<T extends string> = {
  id: T;
  label: string;
  count?: number;
};

export default function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
}: {
  items: readonly Tab<T>[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
}) {
  return (
    <div className="overflow-x-auto">
      <div className="flex min-w-max gap-1 border-b border-ifma-border" role="tablist" aria-label={ariaLabel}>
        {items.map((item) => {
          const active = item.id === value;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onChange(item.id)}
              className={`relative flex h-11 items-center gap-2 px-4 text-sm font-semibold transition-colors ${
                active ? "text-caisbe-red" : "text-caisbe-muted hover:text-caisbe-text"
              }`}
            >
              {item.label}
              {item.count !== undefined ? (
                <span className="rounded-full bg-ifma-border-light px-2 py-0.5 text-xs">{item.count}</span>
              ) : null}
              {active ? <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-caisbe-red" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
