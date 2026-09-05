type CollapseToggleProps = {
  expanded: boolean;
  onToggle: () => void;
  label: string;
  className?: string;
};

/** Chevron control for collapsing long LMS editor sections. */
export function CollapseToggle({
  expanded,
  onToggle,
  label,
  className = "",
}: CollapseToggleProps) {
  return (
    <button
      type="button"
      title={expanded ? `Collapse ${label}` : `Expand ${label}`}
      aria-label={expanded ? `Collapse ${label}` : `Expand ${label}`}
      aria-expanded={expanded}
      onClick={onToggle}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-caisbe-muted transition-colors hover:bg-ifma-border-light hover:text-caisbe-green ${className}`}
    >
      <svg
        className={`h-4 w-4 transition-transform ${expanded ? "rotate-90" : ""}`}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    </button>
  );
}
