"use client";

type PassMarkControlProps = {
  value: number;
  onChange: (value: number) => void;
  onCommit: () => void;
  label?: string;
  description?: string;
  ariaLabel?: string;
};

export default function PassMarkControl({
  value,
  onChange,
  onCommit,
  label = "Pass mark",
  description = "Minimum score learners need to pass.",
  ariaLabel = "Pass percent",
}: PassMarkControlProps) {
  function update(raw: string) {
    const next = Number(raw);
    onChange(Number.isFinite(next) ? Math.min(100, Math.max(0, next)) : 0);
  }

  return (
    <div className="rounded-xl border border-ifma-border bg-admin-surface-muted/50 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-caisbe-text">{label}</p>
          <p className="mt-1 max-w-xl text-xs leading-5 text-caisbe-muted">{description}</p>
        </div>
        <div className="flex shrink-0 items-baseline gap-0.5 text-caisbe-red">
          <span className="font-display text-3xl font-semibold tabular-nums leading-none">{value}</span>
          <span className="text-sm font-bold">%</span>
        </div>
      </div>
      <div className="mt-5 flex items-center gap-4">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(event) => update(event.target.value)}
          onMouseUp={onCommit}
          onTouchEnd={onCommit}
          className="h-2 min-w-0 flex-1 cursor-pointer appearance-none rounded-full bg-ifma-border accent-caisbe-red"
          aria-label={ariaLabel}
        />
        <label className="relative block w-24 shrink-0">
          <span className="sr-only">{ariaLabel}</span>
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(event) => update(event.target.value)}
            onBlur={onCommit}
            className="h-11 w-full rounded-lg border border-ifma-border bg-white pl-3 pr-8 text-sm font-semibold tabular-nums text-caisbe-text outline-none focus:border-caisbe-red focus:ring-4 focus:ring-caisbe-red/10"
          />
          <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-caisbe-muted">%</span>
        </label>
      </div>
    </div>
  );
}
