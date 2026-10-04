import Link from "next/link";

const variantStyles = {
  primary:
    "inline-flex w-full min-w-0 items-center justify-center rounded-full bg-caisbe-red px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-caisbe-red-dark sm:w-auto sm:min-w-[150px] sm:px-7",
  secondary:
    "inline-flex w-full min-w-0 items-center justify-center rounded-full border-2 border-caisbe-red bg-white px-6 py-3.5 text-sm font-bold text-caisbe-red transition hover:-translate-y-0.5 hover:bg-caisbe-red hover:text-white sm:w-auto sm:min-w-[150px] sm:px-7",
  green:
    "inline-flex items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-caisbe-red-dark hover:bg-caisbe-red-dark",
  red:
    "inline-flex items-center justify-center rounded-md border-2 border-caisbe-red bg-caisbe-red px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors hover:border-caisbe-red-dark hover:bg-caisbe-red-dark",
  text:
    "text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark",
  textGreen:
    "text-sm font-semibold uppercase tracking-wide text-caisbe-red transition-colors hover:text-caisbe-red-dark",
  pill:
    "inline-flex w-full items-center justify-center rounded-full bg-caisbe-red px-6 py-3.5 text-sm font-bold text-white transition hover:-translate-y-0.5 hover:bg-caisbe-red-dark sm:w-auto sm:px-7",
};

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: keyof typeof variantStyles;
  className?: string;
};

export default function ButtonLink({
  href,
  children,
  variant = "primary",
  className = "",
}: ButtonLinkProps) {
  const classNameFull = `${variantStyles[variant]} ${className}`;
  if (href.startsWith("http://") || href.startsWith("https://")) {
    return (
      <a href={href} className={classNameFull}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} className={classNameFull}>
      {children}
    </Link>
  );
}
