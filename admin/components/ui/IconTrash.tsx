type IconTrashProps = {
  className?: string;
};

export function IconTrash({ className = "h-4 w-4" }: IconTrashProps) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

type DeleteIconButtonProps = {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
};

/** Accessible trash/delete control used across admin LMS screens. */
export function DeleteIconButton({
  label,
  onClick,
  disabled,
  className = "",
}: DeleteIconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-caisbe-muted transition-colors hover:bg-caisbe-red/10 hover:text-caisbe-red disabled:opacity-50 ${className}`}
    >
      <IconTrash />
    </button>
  );
}
