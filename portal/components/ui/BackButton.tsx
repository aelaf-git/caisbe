import Link from "next/link";

type BackButtonProps = {
  href: string;
  className?: string;
};

export default function BackButton({ href, className = "" }: BackButtonProps) {
  return (
    <Link
      href={href}
      aria-label="Go back"
      className={`inline-flex h-10 w-10 items-center justify-center rounded-md border-2 border-caisbe-red text-caisbe-red transition-colors hover:bg-caisbe-red hover:text-white ${className}`}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M19 12H5" />
        <path d="M12 19l-7-7 7-7" />
      </svg>
    </Link>
  );
}
