import Link from "next/link";

type IconPencilProps = {
  className?: string;
};

export function IconPencil({ className = "h-4 w-4" }: IconPencilProps) {
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
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

type EditIconLinkProps = {
  href: string;
  label: string;
  className?: string;
};

/** Accessible pencil/edit link used across admin LMS screens. */
export function EditIconLink({ href, label, className = "" }: EditIconLinkProps) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-caisbe-muted transition-colors hover:bg-caisbe-green/10 hover:text-caisbe-green ${className}`}
    >
      <IconPencil />
    </Link>
  );
}
